/*
 * Фильтрует автокомплит «Группа моделей» в форме профиля импорта по выбранной
 * марке: добавляет параметр brand=<id> к ajax-запросу select2, а на стороне
 * сервера ModelGroupAdmin.get_search_results фильтрует результаты по нему.
 * При смене марки выбранная группа сбрасывается.
 */
(function () {
    function ready(fn) {
        if (document.readyState !== 'loading') { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }

    ready(function () {
        if (!window.django || !django.jQuery) { return; }
        var $ = django.jQuery;
        var $brand = $('#id_brand');
        var $group = $('#id_model_group');
        if (!$brand.length || !$group.length) { return; }

        var el = $group[0];

        function initSelect2() {
            if ($group.data('select2')) {
                $group.select2('destroy');
            }
            $group.select2({
                ajax: {
                    data: function (params) {
                        return {
                            term: params.term,
                            page: params.page,
                            app_label: el.dataset.appLabel,
                            model_name: el.dataset.modelName,
                            field_name: el.dataset.fieldName,
                            brand: $brand.val() || ''
                        };
                    }
                }
            });
        }

        initSelect2();

        $brand.on('change', function () {
            // Сбрасываем группу — она могла принадлежать другой марке.
            $group.val(null).trigger('change');
            initSelect2();
        });
    });
})();
