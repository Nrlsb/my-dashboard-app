/**
 * SEOHead — Componente de metadata SEO para React 19.
 *
 * React 19 eleva automáticamente <title>, <meta> y <link> al <head> del documento
 * cuando se renderizan dentro de un componente. No necesita librería externa.
 *
 * Props:
 *   title        — Título de la página (se agrega " | Distribuidora Espint" automáticamente)
 *   description  — Meta description (máx ~160 caracteres recomendado)
 *   canonical    — URL canónica absoluta de la página
 *   image        — URL absoluta de imagen para OG/Twitter (opcional)
 *   type         — og:type (default: "website", usar "product" para productos)
 *   noindex      — Si true, agrega meta robots noindex (para páginas privadas)
 *   jsonLd       — Objeto de structured data JSON-LD (Schema.org)
 */

const SITE_NAME = 'Distribuidora Espint';
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://espint.com.ar';
const DEFAULT_IMAGE = `${SITE_URL}/logo.svg`;

export default function SEOHead({
    title,
    description,
    canonical,
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    jsonLd = null,
}) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Pinturas y Accesorios al por Mayor`;
    const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : null;
    const absoluteImage = image?.startsWith('http') ? image : `${SITE_URL}${image}`;

    return (
        <>
            <title>{fullTitle}</title>

            {description && <meta name="description" content={description} />}
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:image" content={absoluteImage} />
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            {description && <meta name="twitter:description" content={description} />}
            <meta name="twitter:image" content={absoluteImage} />

            {/* Canonical */}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

            {/* JSON-LD Structured Data (acepta objeto único o array) */}
            {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean).map((schema, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            ))}
        </>
    );
}
