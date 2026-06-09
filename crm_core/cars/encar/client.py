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


def build_q(manufacturer: str, model_group: str | None = None) -> str:
    """
    Собирает значение параметра ``q`` для list-эндпоинта.

    Пример (BMW X5):
      (And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.))_.SellType.일반._.ServiceCopyCar.ORIGINAL.)
    Без модели:
      (And.Hidden.N._.(C.CarType.N._.Manufacturer.BMW.)_.SellType.일반._.ServiceCopyCar.ORIGINAL.)
    """
    if model_group:
        car_type = f"(C.CarType.N._.(C.Manufacturer.{manufacturer}._.ModelGroup.{model_group}.))"
    else:
        car_type = f"(C.CarType.N._.Manufacturer.{manufacturer}.)"
    return (
        f"(And.Hidden.N._.{car_type}"
        f"_.SellType.{SELL_TYPE}._.ServiceCopyCar.{SERVICE_COPY_CAR}.)"
    )


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
    def search_list(self, q: str, offset: int = 0, limit: int = 20,
                    count: bool = True) -> dict:
        """
        Список объявлений. Возвращает ответ с ключами ``Count`` и
        ``SearchResults``. Пагинация — через ``sr=|ModifiedDate|offset|limit``.
        """
        params = {
            "count": "true" if count else "false",
            "q": q,
            "sr": f"|ModifiedDate|{offset}|{limit}",
        }
        data = self._get("/search/car/list/mobile", params=params)
        time.sleep(self.request_delay)
        return data

    def iter_list(self, q: str, page_size: int = 20, max_pages: int = 2) -> Iterable[dict]:
        """Итерируется по объявлениям списка с учётом пагинации и лимита страниц."""
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

    def get_vehicle(self, vehicle_id: str | int) -> dict:
        """Полная карточка одного объявления."""
        params = {"include": "CATEGORY,SPEC,PHOTOS,OPTIONS,MANAGE,CONTENTS,ADVERTISEMENT"}
        data = self._get(f"/v1/readside/vehicle/{vehicle_id}", params=params)
        time.sleep(self.request_delay)
        return data

    def get_vehicles(self, vehicle_ids: Iterable[str | int]) -> list[dict]:
        """Карточки сразу по нескольким id."""
        ids = ",".join(str(i) for i in vehicle_ids)
        data = self._get("/v1/readside/vehicles", params={"vehicleIds": ids})
        time.sleep(self.request_delay)
        if isinstance(data, list):
            return data
        return data.get("vehicles", []) or []

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
