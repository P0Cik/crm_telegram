from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import (
    Brand,
    Model,
    Car,
    Advertisement,
    SearchRequest,
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
    OrderSerializer,
    OrderStatusHistorySerializer
)

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
    queryset = Car.objects.select_related('brand', 'model').all()
    serializer_class = CarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'brand': ['exact'],
        'model': ['exact'],
        'year': ['gte', 'lte', 'exact'],
        'fuel_type': ['exact'],
        'transmission': ['exact'],
        'steering_wheel': ['exact'],
        'drive_type': ['exact'],
        'color': ['exact'],
        'seller_country': ['exact'],
    }
    search_fields = ['vin', 'brand__name', 'model__name', 'color']
    ordering_fields = ['year', 'engine_power', 'engine_volume']
    ordering = ['-year']

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Расширенный поиск автомобилей по различным критериям
        """
        queryset = self.get_queryset()
        
        brand = request.query_params.get('brand')
        model = request.query_params.get('model')
        year_min = request.query_params.get('year_min')
        year_max = request.query_params.get('year_max')
        price_min = request.query_params.get('price_min')
        price_max = request.query_params.get('price_max')
        
        if brand:
            queryset = queryset.filter(brand__id=brand)
        if model:
            queryset = queryset.filter(model__id=model)
        if year_min:
            queryset = queryset.filter(year__gte=year_min)
        if year_max:
            queryset = queryset.filter(year__lte=year_max)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


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
        Автоматически устанавливаем пользователя как владельца объявления
        """
        if self.request.user.role != User.Role.CLIENT:
            raise permissions.PermissionDenied("Только клиенты могут создавать объявления")
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
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'brand', 'model']
    ordering_fields = ['id']
    ordering = ['-id']

    def get_queryset(self):
        """
        Пользователи видят только свои поисковые запросы
        """
        user = self.request.user
        if user.is_staff:
            return SearchRequest.objects.select_related('user', 'brand', 'model').all()
        return SearchRequest.objects.select_related('user', 'brand', 'model').filter(user=user)

    def perform_create(self, serializer):
        """
        Автоматически устанавливаем текущего пользователя
        """
        serializer.save(user=self.request.user)

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


class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с заказами.
    Клиенты видят свои заказы, менеджеры могут управлять всеми заказами.
    """
    queryset = Order.objects.select_related(
        'user', 'car', 'car__brand', 'car__model', 'manager'
    ).all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManager]
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
        
        if user.is_staff:
            return Order.objects.select_related(
                'user', 'car', 'car__brand', 'car__model', 'manager'
            ).all()
        
        if user.role == User.Role.MANAGER:
            return Order.objects.select_related(
                'user', 'car', 'car__brand', 'car__model', 'manager'
            ).filter(manager=user)
        
        return Order.objects.select_related(
            'user', 'car', 'car__brand', 'car__model', 'manager'
        ).filter(user=user)

    def perform_create(self, serializer):
        """
        Автоматически устанавливаем текущего пользователя как клиента
        """
        if self.request.user.role != User.Role.CLIENT:
            raise permissions.PermissionDenied("Только клиенты могут создавать заказы")
        serializer.save(user=self.request.user)

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
        
        order.status = new_status
        order.save()
        
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
