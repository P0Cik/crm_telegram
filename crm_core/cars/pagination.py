"""Пагинация API: размер страницы по умолчанию 20, настраивается через ?page_size=."""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
