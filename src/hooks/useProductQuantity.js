import { useState, useEffect } from 'react';

/**
 * Custom hook to manage product quantity logic based on stock and packaging rules.
 * 
 * Rules:
 * 1. If `sbz_desc` (indicator_description) is "0":
 *    - If stock <= 0: Steps are by `pack_quantity`. Min is `pack_quantity`.
 *    - If stock > 0: Steps are by 1 until stock is reached. Above stock, steps are by `pack_quantity`.
 * 2. If `sbz_desc` is not "0", normal behavior (steps by 1, min 1).
 * 
 * @param {object} product - The product object containing stock and packaging info.
 * @param {number} initialValue - Initial quantity (default 1, but adjusted by logic on mount).
 * @returns {object} - { quantity, setQuantity, increment, decrement, handleInputChange, handleBlur, isRestricted, packQty, stock }
 */
export const useProductQuantity = (product, initialValue = 1) => {
    // Parse and normalize values. Handle null/undefined product gracefully.
    const stock = Number(product?.stock_disponible) || 0;

    // Check for restriction. "sbz_desc" comes as "indicator_description" usually.
    const rawIndicator = product?.indicator_description;



    const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);

    const packQty = Number(product?.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;

    // Determine valid initial quantity
    const getInitialQty = () => {
        if (isRestricted && stock <= 0) {
            return packQty;
        }
        return Math.max(1, initialValue);
    };

    const [quantity, setQuantity] = useState(getInitialQty());

    // Reset when product changes
    useEffect(() => {
        setQuantity(getInitialQty());
    }, [product?.id, product?.stock_disponible, product?.indicator_description, product?.pack_quantity]);


    const increment = () => {
        setQuantity(prev => {
            // Normal behavior
            if (!isRestricted) return prev + 1;

            // Restricted behavior
            if (prev < stock) {
                return prev + 1;
            } else {
                // Above or at stock, jump by pack
                // If current is less than stock, next step is min(stock, prev+1)? logic says step 1 until stock.
                // If prev == stock, next is stock + packQty.
                // If prev > stock, next is prev + packQty.
                // Special case: if stock=0, prev=packQty -> prev+packQty.

                // Ensure we align with packaging if we are already in "packaging mode"?
                // Simpler: if prev >= stock, add packQty.
                return prev + packQty;
            }
        });
    };

    const decrement = () => {
        setQuantity(prev => {
            if (!isRestricted) return Math.max(1, prev - 1);

            if (prev > stock) {
                const nextVal = prev - packQty;

                // If dropping below stock...
                if (stock > 0) {
                    if (nextVal < stock) return stock; // Snap to stock limit
                } else {
                    // If stock is 0, min is packQty
                    if (nextVal < packQty) return packQty;
                }
                return Math.max(stock > 0 ? stock : packQty, nextVal);
            }

            // If at or below stock, step by 1
            return Math.max(1, prev - 1);
        });
    };

    const handleInputChange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;

        if (isRestricted) {
            const diff = val - quantity;
            // Detect arrow keys (delta +/- 1)
            if (Math.abs(diff) === 1) {
                if (diff > 0) {
                    // Increment
                    if (quantity >= stock) {
                        setQuantity(quantity + packQty);
                        return;
                    }
                } else {
                    // Decrement
                    if (quantity > stock) {
                        const nextVal = quantity - packQty;
                        if (stock > 0) {
                            setQuantity(Math.max(stock, nextVal));
                        } else {
                            setQuantity(Math.max(packQty, nextVal));
                        }
                        return;
                    }
                }
            }
        }

        setQuantity(val);
    };

    const handleBlur = () => {
        let validQty = quantity;

        // Minimum check
        if (validQty < 1) validQty = 1;

        if (!isRestricted) {
            setQuantity(validQty);
            return;
        }

        // Restricted logic
        if (stock <= 0) {
            // Must be multiple of packQty
            if (validQty < packQty) validQty = packQty;
            else {
                const remainder = validQty % packQty;
                if (remainder !== 0) {
                    // Round up to nearest pack multiple
                    validQty = Math.ceil(validQty / packQty) * packQty;
                }
            }
        } else {
            // Stock > 0
            if (validQty > stock) {
                // Must be stock + N * packQty
                const diff = validQty - stock;
                const packs = Math.ceil(diff / packQty);
                validQty = stock + (packs * packQty);
            }
        }
        setQuantity(validQty);
    };

    return {
        quantity,
        setQuantity,
        increment,
        decrement,
        handleInputChange,
        handleBlur,
        isRestricted,
        packQty,
        stock
    };
};
