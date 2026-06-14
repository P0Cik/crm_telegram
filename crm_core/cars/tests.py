"""
Тесты backend-части: нормализация, апсерт без дублей, деактивация, матчинг
подписок (watermark), валидация Telegram initData, конвертация валюты.
"""
import hashlib
import hmac
import time
from decimal import Decimal
from urllib.parse import urlencode

from django.test import TestCase

from cars import currency
from cars.encar import catalog, mapper, normalization as norm, sync, translate
from cars.encar.client import build_q
from cars.matching import car_matches_request, match_cars_to_subscriptions
from cars.models import (
    Brand, Car, ImportProfile, Model, ModelGroup, SearchRequest, User, ValueTranslation,
)
from cars.telegram_views import verify_telegram_data


def make_catalog(brand_ko='BMW', group_ko='X5', model_ko='X5 (G05)'):
    brand = Brand.objects.create(name_ko=brand_ko, name_en=brand_ko)
    group = ModelGroup.objects.create(brand=brand, name_ko=group_ko, name_en=group_ko)
    model = Model.objects.create(model_group=group, name_ko=model_ko, name_en=model_ko)
    return brand, group, model


# --- Нормализация -----------------------------------------------------------
class NormalizationTests(TestCase):
    def test_fuel(self):
        self.assertEqual(norm.normalize_fuel('디젤')[0], 'DIESEL')
        self.assertEqual(norm.normalize_fuel('가솔린')[0], 'PETROL')
        self.assertEqual(norm.normalize_fuel('가솔린+전기')[0], 'HYBRID')
        self.assertEqual(norm.normalize_fuel('전기')[0], 'ELECTRIC')
        # неизвестное -> OTHER + исходное значение сохраняется
        code, ru, _ = norm.normalize_fuel('무언가')
        self.assertEqual(code, 'OTHER')
        self.assertEqual(ru, '무언가')

    def test_transmission_color(self):
        self.assertEqual(norm.normalize_transmission('오토')[1], 'Автомат')
        self.assertEqual(norm.normalize_color('흰색')[0], 'Белый')


# --- Валюта (만원 -> воны -> рубли) -----------------------------------------
class CurrencyTests(TestCase):
    def test_man_to_won(self):
        self.assertEqual(mapper.man_to_won(5490), 54_900_000)
        self.assertIsNone(mapper.man_to_won(None))

    def test_krw_to_rub_uses_db_rate(self):
        currency.set_krw_rub_rate(Decimal('0.07'))
        self.assertEqual(currency.krw_to_rub(54_900_000), Decimal('3843000.00'))

    def test_rub_to_krw_roundtrip(self):
        currency.set_krw_rub_rate(Decimal('0.065'))
        self.assertIsNone(currency.rub_to_krw(None))
        self.assertAlmostEqual(currency.rub_to_krw(65000), 1_000_000, delta=10)


# --- Парсинг и апсерт (дедупликация) ----------------------------------------
SAMPLE_ITEM = {
    "Id": "41651395",
    "Manufacturer": "BMW",
    "Model": "X5 (G05)",
    "ModelGroup": "X5",
    "Badge": "xDrive 30d xLine",
    "Transmission": "오토",
    "FuelType": "디젤",
    "Year": 202209.0,
    "FormYear": "2022",
    "Mileage": 108736.0,
    "Color": "흰색",
    "ColorExpression": "#ffffff;#ffffff",
    "ServiceCopyCar": "ORIGINAL",
    "Price": 5820.0,
    "SellType": "일반",
    "OfficeCityState": "대구",
    "Photos": [{"location": "/x/y_001.jpg", "ordering": 1.0, "type": "001"}],
}

DUPLICATION_ITEM = dict(SAMPLE_ITEM, Id="999", ServiceCopyCar="DUPLICATION")


class UpsertTests(TestCase):
    def test_parse_skips_duplication(self):
        self.assertIsNone(mapper.parse_list_item(DUPLICATION_ITEM))
        self.assertIsNotNone(mapper.parse_list_item(SAMPLE_ITEM))

    def test_upsert_no_duplicates_and_catalog(self):
        parsed = mapper.parse_list_item(SAMPLE_ITEM)
        car1, created1 = sync.upsert_from_list(parsed)
        self.assertTrue(created1)
        # повторный синк того же объявления не создаёт дубль
        car2, created2 = sync.upsert_from_list(parsed)
        self.assertFalse(created2)
        self.assertEqual(car1.pk, car2.pk)
        self.assertEqual(Car.objects.filter(source='encar', external_id='41651395').count(), 1)
        # нормализация и цена в вонах
        self.assertEqual(car1.fuel_type, 'DIESEL')
        self.assertEqual(car1.price_krw, 58_200_000)
        self.assertEqual(car1.mileage, 108736)
        # каталог построен Brand -> ModelGroup -> Model
        self.assertEqual(car1.brand.name_ko, 'BMW')
        self.assertEqual(car1.model_group.name_ko, 'X5')
        self.assertEqual(car1.model.name_ko, 'X5 (G05)')

    def test_deactivate_stale(self):
        car, _ = sync.upsert_from_list(mapper.parse_list_item(SAMPLE_ITEM))
        # объявление не встретилось в новом прогоне -> деактивируется
        n = sync.deactivate_stale(car.brand, car.model_group, seen_external_ids=set())
        self.assertEqual(n, 1)
        self.assertFalse(Car.objects.get(external_id='41651395').is_active)


# --- Матчинг подписок + watermark -------------------------------------------
class MatchingTests(TestCase):
    def setUp(self):
        # курс 1:1 — чтобы пороги в рублях совпадали с ценой в вонах в тестах
        currency.set_krw_rub_rate(Decimal('1'))
        self.user = User.objects.create(username='u1', telegram_id=111)
        self.brand, self.group, self.model = make_catalog()
        self.car = Car.objects.create(
            source='encar', external_id='1', brand=self.brand, model_group=self.group,
            model=self.model, year=2022, fuel_type='DIESEL', is_active=True,
            price_krw=3_000_000, mileage=100000,
        )

    def _make_req(self, **kw):
        return SearchRequest.objects.create(user=self.user, status=SearchRequest.Status.TRACKED, **kw)

    def test_match_by_brand_year_price(self):
        req = self._make_req(brand=self.brand, year_min=2020, price_max=4_000_000)
        self.assertTrue(car_matches_request(self.car, req))

    def test_no_match_price_too_low(self):
        req = self._make_req(brand=self.brand, price_max=1_000_000)
        self.assertFalse(car_matches_request(self.car, req))

    def test_no_match_other_brand(self):
        other = Brand.objects.create(name_ko='Audi', name_en='Audi')
        req = self._make_req(brand=other)
        self.assertFalse(car_matches_request(self.car, req))

    def test_match_by_model_group(self):
        req = self._make_req(model_group=self.group)
        self.assertTrue(car_matches_request(self.car, req))

    def test_match_sends_and_watermark(self):
        self._make_req(brand=self.brand)
        sent = []

        def fake_notifier(user, car, req):
            sent.append((user.id, car.id))
            return True

        n1 = match_cars_to_subscriptions([self.car.id], notifier=fake_notifier)
        self.assertEqual(n1, 1)
        # повторный запуск: watermark уже выставлен -> повторно не шлём
        n2 = match_cars_to_subscriptions([self.car.id], notifier=fake_notifier)
        self.assertEqual(n2, 0)


# --- Telegram initData ------------------------------------------------------
class TelegramAuthTests(TestCase):
    BOT_TOKEN = "123456:TESTTOKEN"

    def _build_init_data(self, auth_date=None, valid=True):
        auth_date = auth_date or int(time.time())
        fields = {
            'user': '{"id":555,"first_name":"Test","username":"tester"}',
            'auth_date': str(auth_date),
        }
        data_check = '\n'.join(f"{k}={fields[k]}" for k in sorted(fields))
        secret = hmac.new(b"WebAppData", self.BOT_TOKEN.encode(), hashlib.sha256).digest()
        h = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
        if not valid:
            h = "deadbeef"
        fields['hash'] = h
        return urlencode(fields)

    def test_valid_initdata(self):
        init = self._build_init_data()
        result = verify_telegram_data(init, self.BOT_TOKEN)
        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 555)

    def test_invalid_hash(self):
        init = self._build_init_data(valid=False)
        self.assertIsNone(verify_telegram_data(init, self.BOT_TOKEN))

    def test_expired_initdata(self):
        init = self._build_init_data(auth_date=int(time.time()) - 100000)
        self.assertIsNone(verify_telegram_data(init, self.BOT_TOKEN, ttl=3600))


# --- Построение q для list/inav ---------------------------------------------
class BuildQTests(TestCase):
    def test_brand_and_group_import(self):
        self.assertEqual(
            build_q('BMW', 'X5'),
            '(And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.))'
            '_.SellType.일반._.ServiceCopyCar.ORIGINAL.)'
        )

    def test_brand_only_import(self):
        self.assertEqual(
            build_q('BMW'),
            '(And.Hidden.N._.(C.CarType.N._.Manufacturer.BMW.)_.SellType.일반._.ServiceCopyCar.ORIGINAL.)'
        )

    def test_root_all_market(self):
        # car_type=None -> без фильтра CarType (все марки, вкл. внутренний рынок)
        self.assertEqual(
            build_q(car_type=None),
            '(And.Hidden.N._.SellType.일반._.ServiceCopyCar.ORIGINAL.)'
        )


# --- Каталог из inav (EngName/Code) -----------------------------------------
INAV_SAMPLE = {
    "Nodes": [
        {"Name": "Manufacturer", "Facets": [
            {"Value": "BMW", "Metadata": {"EngName": ["BMW"], "Code": ["012"]},
             "Refinements": {"Nodes": [
                 {"Name": "ModelGroup", "Facets": [
                     {"Value": "5시리즈", "Metadata": {"EngName": ["5-Series"], "Code": ["003"]},
                      "Refinements": {"Nodes": [
                          {"Name": "Model", "Facets": [
                              {"Value": "5시리즈 (G60)", "Metadata": {"EngName": [""], "Code": ["100"]}},
                          ]},
                      ]}},
                 ]},
             ]}},
            {"Value": "현대", "Metadata": {"EngName": ["Hyundai"], "Code": ["005"]}},
        ]},
    ]
}


class CatalogInavTests(TestCase):
    def test_iter_facets_reads_engname(self):
        groups = catalog.iter_facets(INAV_SAMPLE, "ModelGroup")
        self.assertEqual(groups, [("5시리즈", "5-Series", "003")])

    def test_upsert_brands_with_english_names(self):
        n = catalog.upsert_brands(INAV_SAMPLE)
        self.assertEqual(n, 2)
        self.assertEqual(Brand.objects.get(name_ko="현대").name_en, "Hyundai")
        self.assertEqual(Brand.objects.get(name_ko="BMW").name_en, "BMW")

    def test_upsert_groups_for_brand(self):
        catalog.upsert_groups(INAV_SAMPLE, "BMW")
        group = ModelGroup.objects.get(name_ko="5시리즈")
        self.assertEqual(group.name_en, "5-Series")
        self.assertEqual(group.code, "003")
        self.assertEqual(group.brand.name_ko, "BMW")

    def test_engname_overwrites_korean_fallback(self):
        # сначала группа без EN (как при импорте из списка) -> name_en пуст
        sync.get_or_create_catalog("BMW", "5시리즈")
        group = ModelGroup.objects.get(name_ko="5시리즈")
        self.assertEqual(group.name_en, "")
        self.assertEqual(group.display_name(), "5시리즈")  # падает на name_ko
        # затем приходит EngName из inav -> name_en заполняется/перезаписывается
        sync.get_or_create_catalog("BMW", "5시리즈", group_en="5-Series")
        group.refresh_from_db()
        self.assertEqual(group.name_en, "5-Series")
        self.assertEqual(group.display_name(), "5-Series")


# --- Переводы значений (статика + БД-словарь) --------------------------------
class TranslationTests(TestCase):
    def setUp(self):
        norm.refresh_translation_cache()

    def test_static_translation_used_first(self):
        ru, en = translate.translate_value('color', '흰색', store=False)
        self.assertEqual(ru, 'Белый')
        self.assertEqual(en, 'White')

    def test_db_override_picked_up_after_refresh(self):
        ValueTranslation.objects.create(
            kind='color', source_value='무지개색', name_ru='Радужный', name_en='Rainbow')
        norm.refresh_translation_cache()
        # normalize_color -> (ru, en, hex); сверяем перевод
        self.assertEqual(norm.normalize_color('무지개색')[:2], ('Радужный', 'Rainbow'))

    def test_is_known(self):
        self.assertTrue(norm.is_known('fuel', '디젤'))
        self.assertFalse(norm.is_known('fuel', '완전새로운연료'))

    def test_normalize_brand_returns_string(self):
        self.assertEqual(norm.normalize_brand('현대'), 'Hyundai')
        self.assertEqual(norm.normalize_brand('BMW'), 'BMW')
        # неизвестная латинская марка возвращается как есть
        self.assertEqual(norm.normalize_brand('Rivian'), 'Rivian')
        # неизвестная корейская марка -> '' (заполнит EngName/автоперевод)
        self.assertEqual(norm.normalize_brand('새브랜드'), '')


# --- Профиль импорта: рынок --------------------------------------------------
class ImportProfileMarketTests(TestCase):
    def test_default_market_is_import(self):
        brand = Brand.objects.create(name_ko='BMW', name_en='BMW')
        profile = ImportProfile.objects.create(name='BMW', brand=brand)
        self.assertEqual(profile.car_type, ImportProfile.Market.IMPORT)
        # q профиля по умолчанию — импортный
        market = profile.car_type if profile.car_type in ('N', 'Y') else None
        self.assertEqual(market, 'N')
