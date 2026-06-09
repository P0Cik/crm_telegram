from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

from . import views
from . import parser_views
from . import telegram_views


router = DefaultRouter()

router.register(r'brands', views.BrandViewSet, basename='brand')
router.register(r'models', views.ModelViewSet, basename='model')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'cars', views.CarViewSet, basename='car')
router.register(r'advertisements', views.AdvertisementViewSet, basename='advertisement')
router.register(r'search-requests', views.SearchRequestViewSet, basename='searchrequest')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'order-status-history', views.OrderStatusHistoryViewSet, basename='orderstatushistory')
router.register(r'search-profiles', views.SearchProfileViewSet, basename='searchprofile')


@api_view(['GET'])
def api_root(request, format=None):
    """
    Корневая точка входа в API
    """
    return Response({
        'brands': reverse('brand-list', request=request, format=format),
        'models': reverse('model-list', request=request, format=format),
        'users': reverse('user-list', request=request, format=format),
        'cars': reverse('car-list', request=request, format=format),
        'advertisements': reverse('advertisement-list', request=request, format=format),
        'search_requests': reverse('searchrequest-list', request=request, format=format),
        'orders': reverse('order-list', request=request, format=format),
        'order_status_history': reverse('orderstatushistory-list', request=request, format=format),
        'parser_webhook': '/api/parser/webhook/',
        'parser_status': '/api/parser/status/',
    })


from drf_spectacular.views import (
    SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
)

urlpatterns = [
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('auth/telegram/', telegram_views.telegram_auth, name='telegram-auth'),
    path('parser/webhook/', parser_views.parser_webhook, name='parser-webhook'),
    path('parser/status/', parser_views.parser_status, name='parser-status'),
    path('parser/test/', parser_views.parser_test, name='parser-test'),
    # OpenAPI / документация
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]