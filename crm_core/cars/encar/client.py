"""
HTTP-клиент для получения и синхронизации автомобильных предложений из Encar.

Использует JSON-эндпоинты Encar (возвращают структурированные данные):
  * /search/car/list/mobile        — список объявлений с фильтрацией;
  * /v1/readside/vehicle/{id}       — полная карточка одного объявления;
  * /v1/readside/vehicles           — карточки сразу по нескольким id.

Клиент не перегружает источник: между запросами выдерживается пауза, есть
повторы с экспоненциальной задержкой.
"""
from __future__ import annotations

import logging
import time
from typing import Iterable

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.encar.com"

# Обязательные фильтры: только оригинальные (не дубли) объявления на продажу.
SELL_TYPE = "일반"            # обычная продажа
SERVICE_COPY_CAR = "ORIGINAL"  # оригинал, а не DUPLICATION

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Referer": "https://www.encar.com/",
    "Origin": "https://www.encar.com",
}


def build_q(manufacturer: str | None = None, model_group: str | None = None,
            car_type: str | None = "N") -> str:
    """
    Собирает значение параметра ``q`` для list/inav-эндпоинтов.

    Параметры опциональны, что позволяет строить запросы любого уровня:
      * ``build_q()``                    — корень (все импортные марки);
      * ``build_q(car_type=None)``       — корень со всеми марками (вкл. внутр. рынок);
      * ``build_q("BMW")``               — все группы марки;
      * ``build_q("BMW", "X5")``         — конкретная группа.

    ``car_type``: ``"N"`` — импортные, ``"Y"`` — внутренний рынок Кореи,
    ``"A"`` — все рынки одним запросом (Encar-фильтр CarType.A; экономит запросы
    по сравнению с раздельной выборкой N и Y), ``None`` — сегмент CarType не
    добавляется вовсе (тоже все, но без явного фильтра — для корневого inav).

    Пример (BMW X5, импорт):
      (And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.))_.SellType.일반._.ServiceCopyCar.ORIGINAL.)
    """
    if manufacturer and model_group:
        man = f"(C.Manufacturer.{manufacturer}._.ModelGroup.{model_group}.)"
    elif manufacturer:
        man = f"Manufacturer.{manufacturer}."
    else:
        man = ""

    if car_type:
        core = f"(C.CarType.{car_type}._.{man})" if man else f"CarType.{car_type}."
    else:
        core = man

    segments = ["Hidden.N."]
    if core:
        segments.append(core)
    segments.append(f"SellType.{SELL_TYPE}.")
    segments.append(f"ServiceCopyCar.{SERVICE_COPY_CAR}.")
    return "(And." + "_.".join(segments) + ")"


class EncarClient:
    """Тонкая обёртка над httpx для эндпоинтов Encar."""

    def __init__(self, base_url: str | None = None, timeout: float = 20.0,
                 request_delay: float | None = None, max_retries: int = 3):
        self.base_url = (base_url or getattr(settings, "ENCAR_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.timeout = timeout
        self.request_delay = (
            request_delay if request_delay is not None
            else getattr(settings, "ENCAR_REQUEST_DELAY", 1.0)
        )
        self.max_retries = max_retries
        self._client = httpx.Client(
            base_url=self.base_url, headers=_DEFAULT_HEADERS, timeout=self.timeout
        )

    # -- low level ---------------------------------------------------------
    def _get(self, path: str, params: dict | None = None) -> dict:
        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self._client.get(path, params=params)
                resp.raise_for_status()
                return resp.json()
            except (httpx.HTTPError, ValueError) as exc:  # ValueError = bad JSON
                last_exc = exc
                wait = self.request_delay * (2 ** (attempt - 1))
                logger.warning(
                    "Encar GET %s failed (attempt %s/%s): %s; retry in %.1fs",
                    path, attempt, self.max_retries, exc, wait,
                )
                time.sleep(wait)
        raise RuntimeError(f"Encar request failed: {path}") from last_exc

    # -- public API --------------------------------------------------------
    # Encar отдаёт до 1000 записей за один запрос к list/mobile.
    MAX_PAGE_SIZE = 1000
    # Групповой эндпоинт /vehicles отдаёт максимум 20 карточек за запрос —
    # при большем числе id часть данных молча теряется (нет vin, объёма и т.д.).
    MAX_VEHICLE_IDS = 20

    def search_list(self, q: str, offset: int = 0, limit: int = 100,
                    count: bool = True, inav: str | None = None) -> dict:
        """
        Список объявлений. Возвращает ответ с ключами ``Count`` и
        ``SearchResults`` (и ``iNav`` при запросе фасетов). Пагинация — через
        ``sr=|ModifiedDate|offset|limit`` (объявления отсортированы по дате
        изменения по убыванию).
        """
        limit = min(limit, self.MAX_PAGE_SIZE)
        params = {
            "count": "true" if count else "false",
            "q": q,
            "sr": f"|ModifiedDate|{offset}|{limit}",
        }
        if inav:
            params["inav"] = inav
        data = self._get("/search/car/list/mobile", params=params)
        time.sleep(self.request_delay)
        return data

    def iter_list(self, q: str, page_size: int = 100, max_pages: int = 5) -> Iterable[dict]:
        """
        Лениво итерируется по объявлениям с пагинацией. Страница тянется только
        при дальнейшем потреблении генератора — потребитель может прервать обход
        (ранний останов), и лишние страницы не запрашиваются.
        """
        page_size = min(page_size, self.MAX_PAGE_SIZE)
        first = self.search_list(q, offset=0, limit=page_size)
        total = int(first.get("Count", 0) or 0)
        results = first.get("SearchResults", []) or []
        for item in results:
            yield item
        fetched = len(results)
        page = 1
        while fetched < total and page < max_pages:
            data = self.search_list(q, offset=fetched, limit=page_size)
            batch = data.get("SearchResults", []) or []
            if not batch:
                break
            for item in batch:
                yield item
            fetched += len(batch)
            page += 1

    def get_inav(self, q: str) -> dict:
        """Возвращает блок ``iNav`` (фасеты марок/групп/моделей) для запроса q."""
        data = self.search_list(q, offset=0, limit=1, count=True, inav="|Metadata|Sort")
        return data.get("iNav", {}) or {}

    def get_vehicle(self, vehicle_id: str | int) -> dict:
        """Полная карточка одного объявления."""
        params = {"include": "CATEGORY,SPEC,PHOTOS,OPTIONS,MANAGE,CONTENTS,ADVERTISEMENT"}
        data = self._get(f"/v1/readside/vehicle/{vehicle_id}", params=params)
        time.sleep(self.request_delay)
        return data

    def get_vehicles(self, vehicle_ids: Iterable[str | int]) -> list[dict]:
        """
        Карточки сразу по нескольким id. Не более ``MAX_VEHICLE_IDS`` (20) за
        запрос — если передано больше, id разбиваются на несколько запросов,
        чтобы Encar не обрезал ответ (иначе часть авто осталась бы без vin,
        объёма двигателя и прочих детальных полей).
        """
        ids = [str(i) for i in vehicle_ids]
        out: list[dict] = []
        for start in range(0, len(ids), self.MAX_VEHICLE_IDS):
            chunk = ids[start:start + self.MAX_VEHICLE_IDS]
            data = self._get("/v1/readside/vehicles", params={"vehicleIds": ",".join(chunk)})
            time.sleep(self.request_delay)
            if isinstance(data, list):
                out.extend(data)
            else:
                out.extend(data.get("vehicles", []) or [])
        return out

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
