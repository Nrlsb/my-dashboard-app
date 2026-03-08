const FUNCTIONAL_CATEGORIES = [
    // --- AUTOMOTOR ---
    { code: 'FUNC_AUTO_DETAILING', name: 'Detailing', condition: `(sbm_desc ILIKE '%3D /%' OR b1_desc ILIKE '%MICROFIBRA%' OR b1_desc ILIKE '%REVIVIDOR%' OR b1_desc ILIKE '%CERAS%')` },
    { code: 'FUNC_AUTO_RO', name: 'R.O Automotive', condition: `(sbm_desc ILIKE '%R.O AUTOMOTIVE%' OR sbm_desc ILIKE '%ROBERLO%')` },
    { code: 'FUNC_AUTO_PULIDO', name: 'Pulido', condition: `(b1_desc ILIKE '%PULIR%' OR b1_desc ILIKE '%POLISH%' OR b1_desc ILIKE '%PASTA%' OR sbm_desc ILIKE '%MMB%' OR sbm_desc ILIKE '%PPG%')` },
    { code: 'FUNC_AUTO_ACCESORIOS', name: 'Accesorios Automotor', condition: `(b1_desc ILIKE '%PAD%' OR b1_desc ILIKE '%ESPONJA%' OR b1_desc ILIKE '%BONETE%')` },

    // --- PINTURA ---
    { code: 'FUNC_PINT_METAL', name: 'Metal', condition: `(b1_desc ILIKE '%ESMALTE%' OR b1_desc ILIKE '%ANTIOXIDO%' OR b1_desc ILIKE '%CONVERTIDOR%')` },
    { code: 'FUNC_PINT_INTERIOR', name: 'Interior', condition: `(b1_desc ILIKE '%INTERIOR%' OR b1_desc ILIKE '%LATEX%')` },
    { code: 'FUNC_PINT_TECHOS', name: 'Techos', condition: `(b1_desc ILIKE '%TECHOS%' OR b1_desc ILIKE '%MEMBRANA%' OR sbm_desc ILIKE '%PLAVICON%')` },
    { code: 'FUNC_PINT_PISOS', name: 'Pisos', condition: `(b1_desc ILIKE '%PISO%' OR b1_desc ILIKE '%DEMARCACION%')` },
    { code: 'FUNC_PINT_ESPECIALES', name: 'Especiales', condition: `(b1_desc ILIKE '%EPOXI%' OR b1_desc ILIKE '%PIZARRON%' OR b1_desc ILIKE '%ALTA TEMPERATURA%')` },
    { code: 'FUNC_PINT_MADERA', name: 'Madera', condition: `(sbm_desc ILIKE '%CETOL%' OR sbm_desc ILIKE '%PETRILAC%' OR b1_desc ILIKE '%BARNIZ%' OR b1_desc ILIKE '%IMPREGNANTE%' OR b1_desc ILIKE '%TINTA%MADERA%')` },
    { code: 'FUNC_PINT_PILETAS', name: 'Piletas', condition: `(b1_desc ILIKE '%PILETA%')` },
    { code: 'FUNC_PINT_EXTERIOR', name: 'Exterior', condition: `(b1_desc ILIKE '%EXTERIOR%' OR b1_desc ILIKE '%FRENTE%')` },
    { code: 'FUNC_PINT_LADRILLOS', name: 'Ladrillos', condition: `(b1_desc ILIKE '%LADRILLO%')` },

    // --- ACCESORIOS ---
    { code: 'FUNC_ACC_DISCOS', name: 'Discos', condition: `(b1_desc ILIKE '%DISCO%')` },
    { code: 'FUNC_ACC_LIJAS', name: 'Lijas', condition: `(b1_desc ILIKE '%LIJA%' OR b1_desc ILIKE '%ABRAP%')` },
    { code: 'FUNC_ACC_RODILLOS', name: 'Rodillos', condition: `(b1_desc ILIKE '%RODILLO%')` },
    { code: 'FUNC_ACC_PINCELES', name: 'Pinceles', condition: `(b1_desc ILIKE '%PINCEL%' OR b1_desc ILIKE '%BROCHA%')` },
    { code: 'FUNC_ACC_CINTAS', name: 'Cintas', condition: `(b1_desc ILIKE '%CINTA%')` },
    { code: 'FUNC_ACC_COMPLEMENTOS', name: 'Complementos', condition: `(b1_desc ILIKE '%CABALLETE%' OR b1_desc ILIKE '%BANDEJA%' OR b1_desc ILIKE '%ESPATULA%')` },
    { code: 'FUNC_ACC_PROTECCION', name: 'Proteccion', condition: `(b1_desc ILIKE '%MASCARILLA%' OR b1_desc ILIKE '%GUANTE%' OR b1_desc ILIKE '%BOTIN%' OR sbm_desc ILIKE '%ROGUANT%')` },

    // --- PREP. DE SUPERFICIES ---
    { code: 'FUNC_PREP_SELLADORES', name: 'Selladores', condition: `(b1_desc ILIKE '%SELLADOR%' OR b1_desc ILIKE '%SILICONA%')` },
    { code: 'FUNC_PREP_ENDUIDO', name: 'Enduido', condition: `(b1_desc ILIKE '%ENDUIDO%' OR b1_desc ILIKE '%ENDUÍDO%')` },
    { code: 'FUNC_PREP_FIJADORES', name: 'Fijadores', condition: `(b1_desc ILIKE '%FIJADOR%' OR b1_desc ILIKE '%IMPRIMACION%')` },
    { code: 'FUNC_PREP_REPARACION', name: 'Reparacion', condition: `(b1_desc ILIKE '%MASILLA%' OR b1_desc ILIKE '%PARCHE%' OR b1_desc ILIKE '%YESO%')` },

    // --- AEROSOLES ---
    { code: 'FUNC_AERO_RUSTOLEUM', name: 'Rust Oleum', condition: `(sbm_desc ILIKE '%RUST OLEUM%' OR sbm_desc ILIKE '%RUST-OLEUM%')` },
    { code: 'FUNC_AERO_TERSUAVE', name: 'Tersuave', condition: `(sbm_desc ILIKE '%TERSUAVE%' AND b1_desc ILIKE '%AEROSOL%')` },
];

module.exports = { FUNCTIONAL_CATEGORIES };
