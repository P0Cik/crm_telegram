import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Min, Max, Count
from django.contrib.auth import get_user_model

from .models import (
    Brand,
    ModelGroup,
    Model,
    Car,
    SearchRequest,
    ImportProfile,
    Order,
    OrderStatusHistory,
)
from .serializers import (
    BrandSerializer,
    ModelGroupSerializer,
    ModelSerializer,
    UserSerializer,
    CarSerializer,
    SearchRequestSerializer,
    ImportProfileSerializer,
    OrderSerializer,
    OrderStatusHistorySerializer,
)
from .filters import CarFilter
from .currency import get_krw_rub_rate, krw_to_rub

logger = logging.getLogger(__name__)

# Импорт для уведомлений
try:
    from bot.notifications import (
        send_order_notification,
        send_order_status_notification,
        send_subscription_notification,
    )
    NOTIFICATIONS_ENABLED = True
except ImportError:
    NOTIFICATIONS_ENABLED = False

User = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Разрешает редактирование только владельцу объекта."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsOwnerOrManager(permissions.BasePermission):
    """Разрешает доступ владельцу или менеджеру."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'manager'):
            return obj.manager == request.user
        return False


class IsManagerOrStaff(permissions.BasePermission):
    """Доступ только менеджерам и администраторам."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or getattr(u, 'role', None) == User.Role.MANAGER))


class BrandViewSet(viewsets.ModelViewSet):
    """Марки автомобилей. Просмотр всем, изменения — администраторам."""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name_en', 'name_ko']
    ordering_fields = ['name_en', 'name_ko']
    ordering = ['name_en']


class ModelGroupViewSet(viewsets.ModelViewSet):
    """Группы моделей (X5, 5시리즈 и т.п.)."""
    queryset = ModelGroup.objects.select_related('brand').all()
    serializer_class = ModelGroupSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['brand']
    search_fields = ['name_en', 'name_ko', 'brand__name_en']
    ordering_fields = ['name_en', 'brand__name_en']
    ordering = ['brand__name_en', 'name_en']


class ModelViewSet(viewsets.ModelViewSet):
    """Модели автомобилей."""
    queryset = Model.objects.select_related('model_group', 'model_group__brand').all()
    serializer_class = ModelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    # brand -> через группу моделей; model_group — напрямую
    filterset_fields = {'model_group': ['exact'], 'model_group__brand': ['exact']}
    search_fields = ['name_en', 'name_ko', 'model_group__brand__name_en']
    ordering_fields = ['name_en']
    ordering = ['model_group__brand__name_en', 'name_en']

    def get_queryset(self):
        qs = super().get_queryset()
        # Поддержка ?brand=<id> (фронтенд фильтрует модели по марке)
        brand_id = self.request.query_params.get('brand')
        if brand_id:
            qs = qs.filter(model_group__brand_id=brand_id)
        return qs


class UserViewSet(viewsets.ModelViewSet):
    """Пользователи. Себя видят все, всех — администраторы."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['username', 'date_joined']
    ordering = ['-date_joined']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        if user.role == User.Role.MANAGER:
            return User.objects.filter(is_superuser=False)
        return User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Только администраторы могут создавать пользователей")
        serializer.save()


class CarViewSet(viewsets.ModelViewSet):
    """Каталог автомобилей. Просмотр всем, изменения — авторизованным."""
    queryset = (
        Car.objects.select_related('brand', 'model_group', 'model')
        .prefetch_related('photos')
        .all()
    )
    serializer_class = CarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarFilter
    search_fields = ['vin', 'brand__name_en', 'model__name_en', 'model__name_ko', 'badge', 'color']
    ordering_fields = ['year', 'engine_volume', 'first_seen_at', 'price_krw', 'mileage']
    ordering = ['-first_seen_at']

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Курс считаем один раз на запрос — для вычисления price_rub
        ctx['krw_rub_rate'] = get_krw_rub_rate()
        return ctx

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and 'is_active' not in self.request.query_params:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'])
    def filters(self, request):
        """
        Доступные значения фильтров для построения UI (считаются по активным
        авто). Помимо каталога марок/групп/моделей отдаёт распределение по КПП,
        кузову, цвету, региону и топливу с количеством, а также диапазоны года,
        цены (в рублях) и пробега — чтобы фронтенд строил полные фильтры.
        """
        active = Car.objects.filter(is_active=True)

        def catalog(model_cls, related):
            return (model_cls.objects.filter(**{f'{related}__is_active': True})
                    .distinct()
                    .annotate(count=Count(related, filter=Q(**{f'{related}__is_active': True}))))

        brands = [
            {'id': b.id, 'name': b.display_name('en'), 'name_ko': b.name_ko, 'count': b.count}
            for b in catalog(Brand, 'car').order_by('-count')
        ]
        model_groups = [
            {'id': g.id, 'name': g.display_name('en'), 'brand_id': g.brand_id, 'count': g.count}
            for g in catalog(ModelGroup, 'car').order_by('brand__name_en', '-count')
        ]
        models = [
            {'id': m.id, 'name': m.display_name('en'), 'model_group_id': m.model_group_id,
             'brand_id': m.model_group.brand_id, 'count': m.count}
            for m in catalog(Model, 'car').select_related('model_group').order_by('-count')
        ]

        def distinct_values(field):
            rows = (active.exclude(**{field: ''})
                    .values(field).annotate(count=Count('id')).order_by('-count'))
            return [{'value': r[field], 'count': r['count']} for r in rows if r[field]]

        fuel_types = [
            {'value': v, 'display': d, 'count': active.filter(fuel_type=v).count()}
            for v, d in Car.FuelType.choices
        ]
        fuel_types = [f for f in fuel_types if f['count'] > 0]

        # Количество мест: распределение по числу мест (для фильтра)
        seat_counts = [
            {'value': r['seat_count'], 'count': r['count']}
            for r in (active.exclude(seat_count__isnull=True)
                      .values('seat_count').annotate(count=Count('id')).order_by('seat_count'))
        ]

        year_range = active.aggregate(min=Min('year'), max=Max('year'))
        mileage_range = active.aggregate(min=Min('mileage'), max=Max('mileage'))
        krw_range = active.aggregate(min=Min('price_krw'), max=Max('price_krw'))
        rate = get_krw_rub_rate()
        price_range = {
            'min': float(krw_to_rub(krw_range['min'], rate)) if krw_range['min'] else None,
            'max': float(krw_to_rub(krw_range['max'], rate)) if krw_range['max'] else None,
        }
        return Response({
            'brands': brands,
            'model_groups': model_groups,
            'models': models,
            'fuel_types': fuel_types,
            'transmissions': distinct_values('transmission'),
            'body_types': distinct_values('body_type'),
            'colors': distinct_values('color'),
            'interior_colors': distinct_values('interior_color'),
            'seat_counts': seat_counts,
            'regions': distinct_values('region'),
            'total': active.count(),
            'year_range': year_range,
            'mileage_range': mileage_range,
            'price_range': price_range,
        })


class SearchRequestViewSet(viewsets.ModelViewSet):
    """Поисковые запросы (подписки). Пользователь управляет своими."""
    queryset = SearchRequest.objects.select_related('user', 'brand', 'model_group', 'model').all()
    serializer_class = SearchRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'brand', 'model_group', 'model']
    ordering_fields = ['id']
    ordering = ['-id']

    def get_queryset(self):
        user = self.request.user
        base = SearchRequest.objects.select_related('user', 'brand', 'model_group', 'model')
        if not user.is_authenticated:
            return base.none()
        if user.is_staff:
            return base.all()
        return base.filter(user=user)

    def perform_create(self, serializer):
        search_request = serializer.save()
        if NOTIFICATIONS_ENABLED:
            try:
                send_subscription_notification(search_request.user, search_request)
            except Exception as exc:
                logger.error("Не удалось отправить уведомление о подписке: %s", exc)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        search_request = self.get_object()
        search_request.status = SearchRequest.Status.CANCELLED
        search_request.save(update_fields=['status'])
        return Response(self.get_serializer(search_request).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        search_request = self.get_object()
        search_request.status = SearchRequest.Status.TRACKED
        search_request.save(update_fields=['status'])
        return Response(self.get_serializer(search_request).data)


class OrderViewSet(viewsets.ModelViewSet):
    """Заказы. Клиенты видят свои, менеджеры — все."""
    queryset = Order.objects.select_related(
        'user', 'car', 'car__brand', 'car__model', 'manager'
    ).all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'car__brand', 'car__model']
    search_fields = ['car__vin', 'car__brand__name_en', 'car__model__name_en']
    ordering_fields = ['created_at', 'total_price', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        base = Order.objects.select_related('user', 'car', 'car__brand', 'car__model', 'manager')
        if not user.is_authenticated:
            return base.none()
        if user.is_staff or user.role == User.Role.MANAGER:
            return base.all()
        return base.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        order = serializer.save()
        OrderStatusHistory.objects.create(
            order=order, status=order.status, updated_by=user, comment='Заявка создана'
        )
        if NOTIFICATIONS_ENABLED:
            try:
                send_order_notification(order.user, order)
            except Exception:
                pass

    @action(detail=True, methods=['post'])
    def assign_manager(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'error': 'Только администраторы могут назначать менеджеров'},
                            status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        manager_id = request.data.get('manager_id')
        try:
            manager = User.objects.get(id=manager_id, role=User.Role.MANAGER)
            order.manager = manager
            order.save(update_fields=['manager'])
            return Response(self.get_serializer(order).data)
        except User.DoesNotExist:
            return Response({'error': 'Менеджер не найден'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        user = request.user
        if user.role not in [User.Role.MANAGER, User.Role.CARRIER] and not user.is_staff:
            return Response({'error': 'Недостаточно прав для изменения статуса'},
                            status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        if new_status not in dict(Order.Status.choices):
            return Response({'error': 'Некорректный статус'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        order.status = new_status
        order.save(update_fields=['status'])
        if old_status != new_status:
            OrderStatusHistory.objects.create(
                order=order, status=new_status, updated_by=user,
                comment=request.data.get('comment', '') or ''
            )
            if NOTIFICATIONS_ENABLED:
                try:
                    send_order_status_notification(order.user, order, new_status)
                except Exception:
                    pass
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        order = self.get_object()
        history = order.status_history.all()
        serializer = OrderStatusHistorySerializer(history, many=True, context={'request': request})
        return Response(serializer.data)


class OrderStatusHistoryViewSet(viewsets.ModelViewSet):
    """История статусов заказов. Создавать могут менеджеры и перевозчики."""
    queryset = OrderStatusHistory.objects.select_related('order', 'updated_by').all()
    serializer_class = OrderStatusHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['order', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        base = OrderStatusHistory.objects.select_related('order', 'updated_by')
        if user.is_staff:
            return base.all()
        if user.role == User.Role.MANAGER:
            return base.filter(Q(order__manager=user) | Q(order__user=user))
        if user.role == User.Role.CLIENT:
            return base.filter(order__user=user)
        return base.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.MANAGER, User.Role.CARRIER] and not user.is_staff:
            raise permissions.PermissionDenied(
                "Только менеджеры и перевозчики могут создавать записи истории"
            )
        serializer.save(updated_by=user)

    @action(detail=False, methods=['get'])
    def for_order(self, request):
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response({'error': 'Параметр order_id обязателен'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.get(id=order_id)
            if not (request.user == order.user or request.user == order.manager or request.user.is_staff):
                return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)
            history = order.status_history.all()
            return Response(self.get_serializer(history, many=True).data)
        except Order.DoesNotExist:
            return Response({'error': 'Заказ не найден'}, status=status.HTTP_404_NOT_FOUND)


class ImportProfileViewSet(viewsets.ModelViewSet):
    """
    Профили импорта данных Encar (для менеджеров). Также доступно ручное
    создание/редактирование через Django Admin.
    """
    queryset = ImportProfile.objects.select_related('brand', 'model_group').all()
    serializer_class = ImportProfileSerializer
    permission_classes = [IsManagerOrStaff]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['is_active', 'source', 'brand']
    ordering_fields = ['name', 'last_run_at']

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """Запустить импорт профиля (через Celery)."""
        profile = self.get_object()
        from .tasks import sync_encar_profile
        sync_encar_profile.delay(profile.id)
        return Response({'status': 'scheduled', 'profile_id': profile.id})
