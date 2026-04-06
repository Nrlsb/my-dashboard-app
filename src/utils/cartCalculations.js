/**
 * Extrae el valor numérico de los litros de la descripción del producto o su capacidad.
 * @param {string} name - Nombre del producto (e.g., "ALBALATEX ... X 20")
 * @param {string} capacityDesc - Descripción de capacidad (e.g., "20.00")
 * @returns {number} - El valor en litros o 1 si no se encuentra.
 */
export const extractLiters = (name = '', capacityDesc = '') => {
    // 1. Intentar desde capacityDesc (más confiable si viene de DB)
    if (capacityDesc) {
        const match = String(capacityDesc).match(/(\d+(\.\d+)?)/);
        if (match) return parseFloat(match[1]);
    }

    // 2. Intentar desde el nombre (patrón "X 20")
    if (name) {
        const match = String(name).match(/X\s*(\d+(\.\d+)?)/i);
        if (match) return parseFloat(match[1]);
    }

    return 1; // Default a 1 si no se especifica
};

/**
 * Agrupa los ítems del carrito por su "oferta de grupo" (mismo título e imagen personalizada).
 * @param {Array} cart - Ítems en el carrito.
 * @param {Map} productMap - Mapa de productos con detalles completos de la DB.
 * @returns {Map} - Mapa de grupos analizados.
 */
export const getCartGroups = (cart, productMap) => {
    const groups = new Map();

    cart.forEach(item => {
        const product = productMap.get(item.id) || item;

        // Solo agrupamos si tiene un título personalizado (como en OffersPage.jsx)
        const customTitle = (product.custom_title || '').trim();
        const customImage = (product.custom_image_url || '').trim();

        if (customTitle !== '') {
            const groupKey = `${customImage}_${customTitle}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    totalUnits: 0,
                    totalLiters: 0,
                    items: [],
                    uniqueProductIds: new Set(),
                    minQuantity: product.min_quantity || 0,
                    minQuantityUnit: product.min_quantity_unit || 'unidades',
                    minQuantityCumulative: product.min_quantity_cumulative,
                    minQuantityGroupAll: product.min_quantity_group_all,
                    minIndividualQuantity: product.min_individual_quantity || 0,
                    totalGroupProducts: product.total_group_products || 1,
                    individualMet: new Map()
                });
            }

            const group = groups.get(groupKey);

            // Robustez: Siempre intentamos obtener la configuración más restrictiva/completa 
            // de los productos que componen el grupo.
            if (product.min_quantity_group_all) {
                group.minQuantityGroupAll = true;
            }
            if (product.total_group_products > group.totalGroupProducts) {
                group.totalGroupProducts = product.total_group_products;
            }
            if (product.min_quantity > group.minQuantity) {
                group.minQuantity = product.min_quantity;
                group.minQuantityUnit = product.min_quantity_unit || 'unidades';
            }

            group.items.push(item.id);
            group.uniqueProductIds.add(item.id);
            const qty = Number(item.quantity) || 0;
            const liters = qty * extractLiters(product.name, product.capacityDesc);

            group.totalUnits += qty;
            group.totalLiters += liters;

            // Seguimiento de mínimos individuales dentro del grupo
            const currentIndividualValue = group.minQuantityUnit === 'litros' ? liters : qty;
            group.individualMet.set(item.id, (group.individualMet.get(item.id) || 0) + currentIndividualValue);
        }
    });

    return groups;
};

/**
 * Calcula el estado completo del carrito, determinando qué ofertas están activas.
 * @param {Array} cart - Ítems en el carrito.
 * @param {Map} productMap - Mapa de productos con detalles.
 * @returns {Object} - { items, totalPrice }
 */
export const calculateCartState = (cart, productMap) => {
    const groups = getCartGroups(cart, productMap);

    const processedItems = cart.map(item => {
        const product = productMap.get(item.id) || item;
        const customTitle = (product.custom_title || '').trim();
        const customImage = (product.custom_image_url || '').trim();
        const groupKey = customTitle !== '' ? `${customImage}_${customTitle}` : null;
        const group = groupKey ? groups.get(groupKey) : null;

        let isOfferActive = false;

        if (group && group.minQuantityCumulative) {
            // Regla acumulativa por grupo
            const totalToCompare = group.minQuantityUnit === 'litros' ? group.totalLiters : group.totalUnits;
            const quantityMet = totalToCompare >= group.minQuantity;

            if (group.minQuantityGroupAll) {
                // Validación estricta: deben estar TODOS los productos distintos del grupo
                // Y además CADA uno debe cumplir el mínimo individualmente.
                const hasAllGroupProducts = group.uniqueProductIds.size >= group.totalGroupProducts;

                let allIndividualMet = true;
                group.individualMet.forEach((val) => {
                    if (val < group.minQuantity) allIndividualMet = false;
                });

                isOfferActive = quantityMet && hasAllGroupProducts && allIndividualMet;
            } else {
                // New logic: Check if at least one item meets the minIndividualQuantity if defined
                let atLeastOneIndividualMet = true;
                if (group.minIndividualQuantity > 0) {
                    atLeastOneIndividualMet = false;
                    group.individualMet.forEach((val) => {
                        if (val >= group.minIndividualQuantity) atLeastOneIndividualMet = true;
                    });
                }

                isOfferActive = quantityMet && atLeastOneIndividualMet;
            }
        } else {
            // Regla individual (o grupo no acumulativo)
            const litersPerUnit = extractLiters(product.name, product.capacityDesc);
            const qty = Number(item.quantity) || 0;
            const totalToCompare = (product.min_quantity_unit || 'unidades') === 'litros'
                ? qty * litersPerUnit
                : qty;

            isOfferActive = product.min_quantity > 0
                ? totalToCompare >= product.min_quantity
                : !!product.oferta;
        }

        const effectivePrice = isOfferActive
            ? (product.offer_price || product.discountedPrice || item.price)
            : (product.price || item.price);

        return {
            ...item,
            isOfferActive,
            effectivePrice: Number(effectivePrice) || 0,
            totalPrice: (Number(effectivePrice) || 0) * item.quantity,
            // Guardamos metadatos útiles para la UI
            minQuantity: group?.minQuantity || product.min_quantity,
            minQuantityUnit: group?.minQuantityUnit || product.min_quantity_unit,
            isCumulative: group?.minQuantityCumulative || product.min_quantity_cumulative,
            minQuantityGroupAll: group?.minQuantityGroupAll || product.min_quantity_group_all,
            totalGroupProducts: group?.totalGroupProducts || product.total_group_products
        };
    });


    const totalPrice = processedItems.reduce((acc, item) => acc + item.totalPrice, 0);

    return {
        items: processedItems,
        totalPrice
    };
};
