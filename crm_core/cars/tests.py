"""
Тесты backend-части: нормализация, апсерт без дублей, матчинг подписок (watermark),
валидация Telegram initData, расчёт цены.
"""
import hashlib
import hmac
import time
from urllib.parse import urlencode

from django.test import TestCase
from django.utils import timezone

from cars.encar import mapper, normalization as norm, sync
from cars.matching import car_matches_request, match_cars_to_subscriptions
from cars.models import Advertisement, Brand, Car, Model, SearchRequest, User
from cars.telegram_views import verify_telegram_data


# --- Нормализация -----------------------------------------------------------
class NormalizationTests(TestCase):
    def test_fuel(self):
        self.assertEqual(norm.normalize_fuel('디젤')[0], 'DIESEL')
        self.assertEqual(norm.normalize_fuel('가솔린')[0], 'PETROL')
        self.assertEqual(norm.normalize_fuel('가솔린+전기')[0], 'HYBRID')
        self.assertEqual(norm.normalize_fuel('전기')[0], 'ELECTRIC')
        # неизвестное -> OTHER + исходное значение
        self.assertEqual(norm.normalize_fuel('무언가')[0], 'OTHER')

    def test_transmission_color(self):
        self.assertEqual(norm.normalize_transmission('오토')[1], 'Автомат')
        self.assertEqual(norm.normalize_color('흰색')[0], 'Белый')


# --- Цена (만원 -> воны -> рубли) -------------------------------------------
class PriceTests(TestCase):
    def test_man_to_won(self):
        self.assertEqual(mapper.man_to_won(5490), 54_900_000)
        self.assertIsNone(mapper.man_to_won(None))

    def test_won_to_rub(self):
        with self.settings(KRW_RUB_RATE=0.065):
            self.assertEqual(mapper.won_to_rub(54_900_000), round(54_900_000 * 0.065, 2))


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

    def test_upsert_no_duplicates(self):
        parsed = mapper.parse_list_item(SAMPLE_ITEM)
        car1, created1 = sync.upsert_from_list(parsed)
        self.assertTrue(created1)
        # повторный синк того же объявления не создаёт дубль
        car2, created2 = sync.upsert_from_list(parsed)
        self.assertFalse(created2)
        self.assertEqual(car1.pk, car2.pk)
        self.assertEqual(Car.objects.filter(source='encar', external_id='41651395').count(), 1)
        # цена и нормализация
        self.assertEqual(car1.fuel_type, 'DIESEL')
        ad = car1.advertisements.first()
        self.assertEqual(ad.price_krw, 58_200_000)
        self.assertEqual(ad.mileage, 108736)

    def test_deactivate_stale(self):
        sync.upsert_from_list(mapper.parse_list_item(SAMPLE_ITEM))
        # объявление не встретилось в новом прогоне -> деактивируется
        n = sync.deactivate_stale('BMW', 'X5', seen_external_ids=set())
        self.assertEqual(n, 1)
        self.assertFalse(Car.objects.get(external_id='41651395').is_active)


# --- Матчинг подписок + watermark -------------------------------------------
class MatchingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='u1', telegram_id=111)
        self.brand = Brand.objects.create(name='BMW')
        self.model = Model.objects.create(brand=self.brand, name='X5 (G05)')
        self.car = Car.objects.create(
            source='encar', external_id='1', brand=self.brand, model=self.model,
            year=2022, fuel_type='DIESEL', is_active=True,
        )
        Advertisement.objects.create(car=self.car, car_price=3_000_000, mileage=100000, is_active=True)

    def _make_req(self, **kw):
        return SearchRequest.objects.create(user=self.user, status=SearchRequest.Status.TRACKED, **kw)

    def test_match_by_brand_year_price(self):
        req = self._make_req(brand=self.brand, year_min=2020, price_max=4_000_000)
        self.assertTrue(car_matches_request(self.car, req))

    def test_no_match_price_too_low(self):
        req = self._make_req(brand=self.brand, price_max=1_000_000)
        self.assertFalse(car_matches_request(self.car, req))

    def test_no_match_other_brand(self):
        other = Brand.objects.create(name='Audi')
        req = self._make_req(brand=other)
        self.assertFalse(car_matches_request(self.car, req))

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
