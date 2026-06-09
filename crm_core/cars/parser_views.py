from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.conf import settings
import json
import logging

from cars.models import Car, Advertisement, Brand, Model

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
def parser_webhook(request):
    """
    Webhook для приема данных от парсера автомобилей.

    Ожидаемый формат данных:
    {
        "api_key": "secret-key",
        "cars": [
            {
                "vin": "string",
                "brand": "string",
                "model": "string",
                "year": int,
                "price_won": int,
                "price_rub": int,
                "fuel_type": "string",
                "engine_volume": float,
                "engine_power": int,
                "transmission": "string",
                "steering_wheel": "LEFT" | "RIGHT",
                "drive_type": "string",
                "color": "string",
                "mileage": int,
                "condition": "string",
                "images": ["url1", "url2"],
                "seller_country": "string"
            }
        ]
    }
    """
    try:
        data = json.loads(request.body)

        # Проверка API ключа
        api_key = data.get('api_key')
        expected_key = getattr(settings, 'PARSER_API_KEY', 'default-key')

        if api_key != expected_key:
            return JsonResponse(
                {'error': 'Invalid API key'},
                status=401
            )

        cars_data = data.get('cars', [])
        created_count = 0
        updated_count = 0
        errors = []

        for car_data in cars_data:
            try:
                # Получаем или создаем марку и модель
                brand, _ = Brand.objects.get_or_create(
                    name=car_data['brand']
                )
                model, _ = Model.objects.get_or_create(
                    name=car_data['model'],
                    brand=brand
                )

                # Дедупликация по (source, external_id). В качестве external_id
                # используем переданный id/vin.
                external_id = str(car_data.get('external_id') or car_data['vin'])
                car, created = Car.objects.update_or_create(
                    source=car_data.get('source', 'webhook'),
                    external_id=external_id,
                    defaults={
                        'vin': car_data.get('vin') or None,
                        'brand': brand,
                        'model': model,
                        'year': car_data['year'],
                        'fuel_type': car_data.get('fuel_type', 'OTHER'),
                        'engine_volume': car_data.get('engine_volume'),
                        'engine_power': car_data.get('engine_power'),
                        'transmission': car_data.get('transmission'),
                        'steering_wheel': car_data.get('steering_wheel', 'LEFT'),
                        'drive_type': car_data.get('drive_type'),
                        'color': car_data.get('color'),
                        'seller_country': car_data.get('seller_country', 'Южная Корея'),
                        'is_active': True,
                    }
                )

                # Создаем или обновляем объявление
                Advertisement.objects.update_or_create(
                    car=car,
                    defaults={
                        'external_id': external_id,
                        'price_krw': car_data.get('price_won'),
                        'car_price': car_data.get('price_rub', 0),
                        'mileage': car_data.get('mileage', 0),
                        'condition': car_data.get('condition', ''),
                        'is_active': True,
                        'vin': car_data.get('vin') or '',
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

                logger.info(f"{'Создан' if created else 'Обновлен'} автомобиль: {car.vin}")

            except Exception as e:
                error_msg = f"Ошибка обработки VIN {car_data.get('vin')}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)

        response_data = {
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'total': len(cars_data),
            'errors': errors
        }

        return JsonResponse(response_data, status=200)

    except json.JSONDecodeError:
        return JsonResponse(
            {'error': 'Invalid JSON'},
            status=400
        )
    except Exception as e:
        logger.error(f"Ошибка в parser_webhook: {str(e)}")
        return JsonResponse(
            {'error': str(e)},
            status=500
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parser_status(request):
    """
    Проверка статуса интеграции с парсером.
    Возвращает статистику по автомобилям.
    """
    try:
        total_cars = Car.objects.count()
        total_ads = Advertisement.objects.count()
        recent_cars = Car.objects.order_by('-id')[:10]

        recent_data = [
            {
                'vin': car.vin,
                'brand': car.brand.name if car.brand else None,
                'model': car.model.name if car.model else None,
                'year': car.year,
            }
            for car in recent_cars
        ]

        return Response({
            'status': 'active',
            'total_cars': total_cars,
            'total_advertisements': total_ads,
            'recent_cars': recent_data,
        })

    except Exception as e:
        logger.error(f"Ошибка в parser_status: {str(e)}")
        return Response(
            {'error': str(e)},
            status=500
        )


@api_view(['POST'])
def parser_test(request):
    """
    Тестовый endpoint для проверки интеграции парсера.
    Можно использовать для отладки.
    """
    try:
        data = request.data

        logger.info(f"Получены тестовые данные от парсера: {data}")

        return Response({
            'success': True,
            'message': 'Данные получены успешно',
            'received_data': data
        })

    except Exception as e:
        logger.error(f"Ошибка в parser_test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=500
        )
