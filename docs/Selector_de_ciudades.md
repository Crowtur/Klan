# Selector de ciudades de Ecuador

El catálogo contiene 223 puntos de referencia en 24 provincias. El buscador acepta la ciudad, sus nombres alternativos y los nombres de cantón indicados en el catálogo. Omite diferencias de mayúsculas y tildes. Si hay varios resultados, muestra la provincia para elegir. También admite una búsqueda como «Olmedo, Loja».

## Selección y guardado

Al mover el marcador, el servidor verifica la pertenencia al territorio ecuatoriano con el contorno nacional, incluidas las islas. Cuando Google devuelve una localidad reconocida, se usa el nombre del catálogo y se aprovecha la provincia para resolver homónimos. Un resultado de país extranjero se rechaza. Si falta una ciudad reconocida o el servicio de geocodificación no responde, se comparan las distancias sobre la esfera a todas las cabeceras. No hay radio máximo. En una zona rural, la ciudad sugerida por proximidad puede pertenecer a un cantón vecino.

El campo «Ciudad» admite edición directa. «Usar ubicación» confirma el nombre y el punto. Al guardar el círculo se persiste la etiqueta y se comprueba que el token de ubicación válido corresponda al usuario. El esquema de datos y el contrato HTTP de guardado siguen siendo compatibles.

## Fuentes geográficas

- GeoNames, extracto de Ecuador. Los puntos adaptados incluyen su identificador en el campo geonameId del catálogo. Los nombres visibles y alias se normalizaron para Klan. [Datos de Ecuador](https://download.geonames.org/export/dump/EC.zip) · [Licencia CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Comité Nacional de Límites Internos (CONALI), Ministerio de Gobierno del Ecuador. División político-administrativa distribuida por geoecu. Se unieron y simplificaron las geometrías provinciales para la validación y visualización. [Fuente y atribución](ATRIBUCION_LIMITES.txt).
- Para La Victoria se utilizó el punto publicado por el GAD de Las Lajas. Para Pablo Sexto se transformó una coordenada del límite urbano a WGS84. Estos puntos sirven como referencias de la cabecera. [Plan de Las Lajas](https://www.laslajas.gob.ec/gaceta/2025/ORDENANZA%20PDYOT%20Y%20PUGS%20DEL%20CANTON%20LAS%20LAJAS%202023%202027.pdf) · [Plan de Pablo Sexto](https://pablosexto.gob.ec/images/PDOT-PUGS/2025/PDOT_Y_PUGS.pdf).
