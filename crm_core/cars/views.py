from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import (
    Brand,
    Model,
    Car,
    Advertisement,
    SearchRequest,
    SearchProfile,
    Order,
    OrderStatusHistory
)
from .serializers import (
    BrandSerializer,
    ModelSerializer,
    UserSerializer,
    CarSerializer,
    AdvertisementSerializer,
    SearchRequestSerializer,
    SearchProfileSerializer,
    OrderSerializer,
    OrderStatusHistorySerializer
)
from .filters import CarFilter

# Импорт для уведомлений
try:
    from bot.notifications import (
        send_order_notification,
        send_order_status_notification,
        send_subscription_notification
    )
    NOTIFICATIONS_ENABLED = True
except ImportError:
    NOTIFICATIONS_ENABLED = False

User = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Разрешает редактирование только владельцу объекта
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Проверяем, есть ли у объекта поле user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsOwnerOrManager(permissions.BasePermission):
    """
    Разрешает доступ владельцу или менеджеру
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'manager'):
            return obj.manager == request.user
        return False


class BrandViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с марками автомобилей.
    Все пользователи могут просматривать, только администраторы могут изменять.
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class ModelViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с моделями автомобилей.
    """
    queryset = Model.objects.select_related('brand').all()
    serializer_class = ModelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['brand']
    search_fields = ['name', 'brand__name']
    ordering_fields = ['name', 'brand__name']
    ordering = ['brand__name', 'name']


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с пользователями.
    Пользователи могут просматривать свой профиль.
    Администраторы могут управлять всеми пользователями.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['username', 'date_joined']
    ordering = ['-date_joined']

    def get_queryset(self):
        """
        Обычные пользователи видят только свой профиль.
        Администраторы видят всех пользователей.
        """
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        """
        Только администраторы могут создавать пользователей
        """
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Только администраторы могут создавать пользователей")
        serializer.save()


class CarViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с автомобилями.
    Все могут просматривать, только авторизованные пользователи могут создавать.
    """
    queryset = (
        Car.objects.select_related('brand', 'model')
        .prefetch_related('advertisements', 'photos')
        .all()
    )
    serializer_class = CarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarFilter
    search_fields = ['vin', 'brand__name', 'model__name', 'model_group', 'badge', 'color']
    ordering_fields = ['year', 'engine_power', 'engine_volume', 'first_seen_at']
    ordering = ['-first_seen_at']

    def get_queryset(self):
        qs = super().get_queryset()
        # По умолчанию в каталоге показываем только активные предложения
        if self.action == 'list' and 'is_active' not in self.request.query_params:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'])
    def filters(self, request):
        """
        Доступные значения фильтров для построения UI: марки, модели,
        типы топлива и диапазоны года/цены.
        """
        from django.db.models import Min, Max

        active = Car.objects.filter(is_active=True)
        brands = list(
            Brand.objects.filter(car__in=active).distinct().values('id', 'name', 'name_ru')
        )
        models = list(
            Model.objects.filter(car__in=active).distinct()
            .values('id', 'name', 'model_group', 'brand_id')
        )
        year_range = active.aggregate(min=Min('year'), max=Max('year'))
        price_range = (
            Advertisement.objects.filter(is_active=True, car__is_active=True)
            .aggregate(min=Min('car_price'), max=Max('car_price'))
        )
        fuel_types = [
            {'value': v, 'display': d} for v, d in Car.FuelType.choices
        ]
        return Response({
            'brands': brands,
            'models': models,
            'fuel_types': fuel_types,
            'year_range': year_range,
            'price_range': price_range,
        })


class AdvertisementViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с объявлениями.
    Все могут просматривать, только клиенты могут создавать свои объявления.
    """
    queryset = Advertisement.objects.select_related('car', 'car__brand', 'car__model').all()
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'car__brand': ['exact'],
        'car__model': ['exact'],
        'car__year': ['gte', 'lte'],
        'car_price': ['gte', 'lte'],
        'mileage': ['gte', 'lte'],
    }
    search_fields = ['car__vin', 'car__brand__name', 'car__model__name', 'condition']
    ordering_fields = ['car_price', 'mileage', 'publication_date']
    ordering = ['-publication_date']

    def get_queryset(self):
        """
        Пользователи могут видеть все объявления, но редактировать только свои
        """
        return Advertisement.objects.select_related('car', 'car__brand', 'car__model').all()

    def perform_create(self, serializer):
        """
        Только менеджеры могут создавать объявления
        """
        if self.request.user.role != User.Role.MANAGER:
            raise permissions.PermissionDenied("Только менеджеры могут создавать объявления")
        serializer.save()

    @action(detail=True, methods=['post'])
    def create_order(self, request, pk=None):
        """
        Создать заказ на основе объявления
        """
        advertisement = self.get_object()
        user = request.user
        
        if user.role != User.Role.CLIENT:
            return Response(
                {'error': 'Только клиенты могут создавать заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order = Order.objects.create(
            user=user,
            car=advertisement.car,
            total_price=advertisement.car_price
        )
        
        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SearchRequestViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с поисковыми запросами.
    Пользователи могут управлять только своими запросами.
    """
    queryset = SearchRequest.objects.select_related('user', 'brand', 'model').all()
    serializer_class = SearchRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'brand', 'model']
    ordering_fields = ['id']
    ordering = ['-id']

    def get_queryset(self):
        """
        Пользователи видят только свои поисковые запросы
        """
        user = self.request.user

        # Если пользователь не аутентифицирован, показываем пустой список
        if not user.is_authenticated:
            return SearchRequest.objects.none()

        if user.is_staff:
            return SearchRequest.objects.select_related('user', 'brand', 'model').all()

        return SearchRequest.objects.select_related('user', 'brand', 'model').filter(user=user)

    def perform_create(self, serializer):
        """
        Автоматически устанавливаем текущего пользователя
        """
        user = self.request.user

        # Логируем входящие данные
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating SearchRequest with data: {self.request.data}")
        logger.info(f"User: {user.username if user.is_authenticated else 'Anonymous'}, Telegram ID: {getattr(user, 'telegram_id', None)}")

        # Если пользователь не аутентифицирован, возвращаем ошибку
        if not user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Необходима аутентификация через Telegram")

        search_request = serializer.save()

        # Логируем сохраненные данные
        logger.info(f"SearchRequest saved with ID: {search_request.id}")
        logger.info(f"Saved fields: brand={search_request.brand}, model={search_request.model}, "
                   f"year_min={search_request.year_min}, year_max={search_request.year_max}, "
                   f"price_min={search_request.price_min}, price_max={search_request.price_max}, "
                   f"mileage_min={search_request.mileage_min}, mileage_max={search_request.mileage_max}, "
                   f"fuel_type={search_request.fuel_type}, transmission={search_request.transmission}")

        # Отправка уведомления в Telegram
        if NOTIFICATIONS_ENABLED:
            try:
                send_subscription_notification(user, search_request)
            except Exception as e:
                logger.error(f"Failed to send subscription notification: {e}")
                # Не прерываем выполнение, если уведомление не отправилось
                pass

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Отменить поисковый запрос
        """
        search_request = self.get_object()
        search_request.status = SearchRequest.Status.CANCELLED
        search_request.save()
        serializer = self.get_serializer(search_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Активировать поисковый запрос
        """
        search_request = self.get_object()
        search_request.status = SearchRequest.Status.TRACKED
        search_request.save()
        serializer = self.get_serializer(search_request)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """
        Логирование при удалении подписки
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Deleting SearchRequest ID: {instance.id}, User: {instance.user.username}")
        super().perform_destroy(instance)
        logger.info(f"SearchRequest ID: {instance.id} deleted successfully")


class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с заказами.
    Клиенты видят свои заказы, менеджеры могут управлять всеми заказами.
    """
    queryset = Order.objects.select_related(
        'user', 'car', 'car__brand', 'car__model', 'manager'
    ).all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'car__brand', 'car__model']
    search_fields = ['car__vin', 'car__brand__name', 'car__model__name']
    ordering_fields = ['created_at', 'total_price', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Клиенты видят только свои заказы.
        Менеджеры видят заказы, которыми они управляют.
        Администраторы видят все заказы.
        """
        user = self.request.user

        # Если пользователь не аутентифицирован, показываем пустой список
        if not user.is_authenticated:
            return Order.objects.none()

        if user.is_staff:
            return Order.objects.select_related(
                'user', 'car', 'car__brand', 'car__model', 'manager'
            ).all()

        if user.role == User.Role.MANAGER:
            return Order.objects.select_related(
                'user', 'car', 'car__brand', 'car__model', 'manager'
            ).all()

        return Order.objects.select_related(
            'user', 'car', 'car__brand', 'car__model', 'manager'
        ).filter(user=user)

    def perform_create(self, serializer):
        """
        Автоматически устанавливаем текущего пользователя как клиента
        """
        user = self.request.user

        # Заявку (бронь) создаёт клиент. Менеджер также может оформить заказ.
        order = serializer.save()

        # Создаём первую запись истории статусов
        OrderStatusHistory.objects.create(
            order=order, status=order.status, updated_by=user,
            comment='Заявка создана'
        )

        # Отправка уведомления в Telegram
        if NOTIFICATIONS_ENABLED:
            try:
                send_order_notification(order.user, order)
            except Exception:
                pass

    @action(detail=True, methods=['post'])
    def assign_manager(self, request, pk=None):
        """
        Назначить менеджера на заказ (только для администраторов)
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Только администраторы могут назначать менеджеров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order = self.get_object()
        manager_id = request.data.get('manager_id')
        
        try:
            manager = User.objects.get(id=manager_id, role=User.Role.MANAGER)
            order.manager = manager
            order.save()
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'Менеджер не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Обновить статус заказа (для менеджеров и администраторов)
        """
        order = self.get_object()
        user = request.user

        if user.role not in [User.Role.MANAGER, User.Role.CARRIER] and not user.is_staff:
            return Response(
                {'error': 'Недостаточно прав для изменения статуса'},
                status=status.HTTP_403_FORBIDDEN
            )

        new_status = request.data.get('status')
        if new_status not in dict(Order.Status.choices):
            return Response(
                {'error': 'Некорректный статус'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = order.status
        order.status = new_status
        order.save()

        # Фиксируем смену статуса в истории
        if old_status != new_status:
            OrderStatusHistory.objects.create(
                order=order, status=new_status, updated_by=user,
                comment=request.data.get('comment', '') or ''
            )

        # Отправка уведомления об изменении статуса
        if NOTIFICATIONS_ENABLED and old_status != new_status:
            try:
                send_order_status_notification(order.user, order, new_status)
            except Exception:
                pass

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Получить историю статусов заказа
        """
        order = self.get_object()
        history = order.status_history.all()
        serializer = OrderStatusHistorySerializer(
            history,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class OrderStatusHistoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с историей статусов заказов.
    Только менеджеры и перевозчики могут создавать записи.
    """
    queryset = OrderStatusHistory.objects.select_related('order', 'updated_by').all()
    serializer_class = OrderStatusHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['order', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Фильтрация истории в зависимости от роли пользователя
        """
        user = self.request.user
        
        if user.is_staff:
            return OrderStatusHistory.objects.select_related('order', 'updated_by').all()
        
        if user.role == User.Role.MANAGER:
            return OrderStatusHistory.objects.select_related('order', 'updated_by').filter(
                Q(order__manager=user) | Q(order__user=user)
            )
        
        if user.role == User.Role.CLIENT:
            return OrderStatusHistory.objects.select_related('order', 'updated_by').filter(
                order__user=user
            )
        
        return OrderStatusHistory.objects.none()

    def perform_create(self, serializer):
        """
        Автоматически устанавливаем пользователя, создавшего запись
        """
        user = self.request.user
        
        if user.role not in [User.Role.MANAGER, User.Role.CARRIER] and not user.is_staff:
            raise permissions.PermissionDenied(
                "Только менеджеры и перевозчики могут создавать записи истории"
            )
        
        serializer.save(updated_by=user)

    @action(detail=False, methods=['get'])
    def for_order(self, request):
        """
        Получить историю для конкретного заказа
        """
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response(
                {'error': 'Параметр order_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
            # Проверяем права доступа
            if not (request.user == order.user or 
                    request.user == order.manager or 
                    request.user.is_staff):
                return Response(
                    {'error': 'Недостаточно прав'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            history = order.status_history.all()
            serializer = self.get_serializer(history, many=True)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class IsManagerOrStaff(permissions.BasePermission):
    """Доступ только менеджерам и администраторам."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or getattr(u, 'role', None) == User.Role.MANAGER))


class SearchProfileViewSet(viewsets.ModelViewSet):
    """
    API для профилей сбора данных Encar (для менеджеров).
    Также доступно ручное создание/редактирование через Django Admin.
    """
    queryset = SearchProfile.objects.all()
    serializer_class = SearchProfileSerializer
    permission_classes = [IsManagerOrStaff]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['is_active', 'source']
    ordering_fields = ['name', 'last_run_at']

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """Запустить синхронизацию профиля (через Celery)."""
        profile = self.get_object()
        from .tasks import sync_encar_profile
        sync_encar_profile.delay(profile.id)
        return Response({'status': 'scheduled', 'profile_id': profile.id})
