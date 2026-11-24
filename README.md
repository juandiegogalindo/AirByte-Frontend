# Air-Byte

Pronóstico de la concentración horaria de PM2,5 a 24 horas por estación de Bogotá. La arquitectura prevista combina React con TypeScript, un backend Django y PostgreSQL.

## Reproducir el entrenamiento

1. Desde la raíz, ejecuta `python scripts/consolidate_rmcab.py` sobre los libros históricos en `datos/RMCAB/`.
2. Ejecuta `python scripts/preparar_dataset_modelo.py`. El CSV utilizado en el entrenamiento fue `datos/RMCAB/dataset_modelo_pm25_24h.csv`, con 239.097 filas de datos, 23.711.091 bytes y SHA-256 `df7dfecd4446fe50e779353d7c6756d2011a914ee41268bc69a6d65744a08948`.
3. Abre [el cuaderno original](notebooks/air_byte.ipynb) en Colab, ejecuta ambas celdas en orden y selecciona el CSV cuando se solicite. La primera entrena el modelo base. La segunda incorpora las observaciones de PM2,5 de hace 1, 3, 6 y 24 horas y guarda [el modelo elegido](modelo/air_byte_pm25_24h_historial.joblib).

El objetivo es la observación en la misma estación exactamente 24 horas después. El entrenamiento utiliza objetivos anteriores a 2024. El cuaderno compara las variantes en 2024 y evalúa 2025 sobre horas con PM2,5 actual observado. El modelo elegido obtuvo un MAE de 7,12 µg/m³ en 28.527 casos de 2025, frente a 8,19 con persistencia. En las 1.093 horas de pico el error absoluto medio fue 22,44 µg/m³.

## Verificar la integración con Django

El modelo guarda los nombres y el orden de las columnas en `feature_names_in_`. Los campos actuales marcados como imputados se presentan al modelo como faltantes. Los retardos usan observaciones de la misma estación a la hora exacta. El caso de referencia en `notebooks/prediccion_referencia.json` contiene las entradas en orden y la salida del modelo guardado. El PM2,5 observado al día siguiente se incluye únicamente para evaluación.

Las dependencias para reproducir la inferencia local están en [requirements.txt](notebooks/requirements.txt). El archivo del modelo registra scikit-learn 1.6.1. El cuaderno exportado conserva sus resultados, pero no registró el inventario completo de versiones de Colab.

## Ejecutar la demo

Instala Python 3.12.14, PostgreSQL 18 y Node compatible con Vite. En PostgreSQL, crea un rol con contraseña y una base propia. Para la suite de integración, el rol de desarrollo necesita permiso para crear la base temporal.

```powershell
createuser -P --createdb airbyte
createdb -O airbyte airbyte
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.lock
python -m pip check
python backend/manage.py verificar_modelo
python backend/manage.py migrate
python backend/manage.py check --database default
```

Completa la contraseña PostgreSQL y una clave aleatoria larga para Django en el archivo `.env` antes de ejecutar los comandos de Django. La configuración se lee de ese archivo y las variables de entorno tienen prioridad.

Coloca los 57 libros originales bajo `datos/RMCAB/<estación>/<año>/` o recupera el consolidado congelado del equipo. [La RMCAB publica los datos históricos](https://www.ambientebogota.gov.co/es/red-de-monitoreo-de-calidad-del-aire-de-bogota-rmcab). La huella de `dataset_RMCAB_limpio.csv` para la demo es `47b3962edd58428384500e7a3010e85f7e86b78a32cd4e4d8f1f152cca69dad8`. El validador rechaza una copia con contenido distinto al importar como `rmcab-v1`.

```powershell
python backend/manage.py importar_rmcab --archivo datos/RMCAB/dataset_RMCAB_limpio.csv --version-datos rmcab-v1
python backend/manage.py test aire cuentas comunidad
python backend/manage.py runserver
```

Agrega `--estacion tunal` para cargar solo esa estación. Repetir la carga conserva los mismos datos y la procedencia. El comando informa horas únicas, conflictos, duplicados y faltantes. La opción `--version-datos` evita un conflicto con la opción `--version` que Django incorpora en todos sus comandos.

En otra terminal, desde `frontend`, ejecuta `npm ci` y `npm run dev`. Abre [Air-Byte](http://localhost:5173). React envía las consultas del mismo origen a Django mediante el proxy de Vite. Para publicar, configura un servidor HTTPS que sirva `frontend/dist`, enrute `/api` y `/admin` a Django, y sirva la carpeta generada por `collectstatic` en `/static`. Configura los hosts permitidos y desactiva `DJANGO_DEBUG`.

### Versiones del histórico

La edición congelada `rmcab-v1` reproduce la referencia de Tunal. El consolidador usado en el cuaderno descartaba las filas marcadas `24:00`. Para recuperar esas observaciones, ejecuta `python scripts/consolidate_rmcab.py --recuperar-medianoche`. Se genera `dataset_RMCAB_limpio_v2.csv` y se conserva el original. Impórtalo con `--version-datos rmcab-v2` y configura `AIRBYTE_HISTORICO=rmcab-v2` para consultarlo. En la edición corregida, el 40 µg/m³ observado a medianoche cambia la referencia de Tunal de 21,4588 a 20,9489 µg/m³.

### Google y moderación

Crea un cliente OAuth de tipo **Aplicación web** en Google Cloud, configura la pantalla de consentimiento y registra la URI exacta `http://localhost:5173/api/v1/auth/google/callback`. Añade la URI HTTPS correspondiente en el despliegue. Si el cliente está en estado de prueba, añade los usuarios de la demo en Google Cloud. Completa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` en `.env` y reinicia Django. El secreto se queda en el servidor.

La sesión queda en `django_session` y la identidad de Google en `cuentas_identidad_google`, vinculada a `auth_user`. El backend intercambia el código con Google, valida el token de identidad y abre una sesión local. React usa el token CSRF en escrituras. Los tokens de Google solo viven durante el intercambio. Para vincular una cuenta existente, entra primero con sus credenciales y pulsa **Vincular Google**.

Ejecuta `python backend/manage.py createsuperuser` para administrar la demo. Para una cuenta de moderación, marca **Es staff** y asígnala al grupo **Moderadores** en Django Admin. Selecciona publicaciones y aplica **Ocultar publicaciones seleccionadas**. La comunidad es pública para lectura. La creación y el borrado de contenido propio requieren sesión.

### Guion

- Tunal, 1 de enero de 2025 a las 01:00. Medición 42, pronóstico 21,4587806153477, observado al día siguiente 12 µg/m³.
- Tunal, 4 de enero a las 05:00. Caso típico de 13, 13,63 y 14 µg/m³.
- Tunal, 18 de febrero a las 11:00. Episodio alto de 50, 28,30 y 92 µg/m³.
- Publica un reporte y un comentario en Tunjuelito, léelos como visitante y oculta el reporte desde Admin.

Todas las horas corresponden a Bogotá. El promedio horario y el horizonte del pronóstico se indican por separado. El MAE del modelo de 7,12 µg/m³ frente a 8,19 de persistencia corresponde a su evaluación de 2025.

## Vista Ahora y pronóstico por hora

La portada consulta la última medición horaria de PM2,5 de la RMCAB para la estación elegida. Presenta fecha, hora y antigüedad. El pronóstico contiene 24 valores, desde una hasta 24 horas después de esa medición, en la zona America/Bogota. Cuando la última lectura tiene tres horas o más, la interfaz indica el retraso y suspende el pronóstico. La pestaña Histórico conserva la demo reproducible de 2025.

La vista consulta la RMCAB como máximo una vez cada cinco minutos por proceso y almacena las lecturas en PostgreSQL bajo `rmcab-actual`. Para acumular retardos mientras la aplicación está cerrada, programa `python backend/manage.py actualizar_rmcab` cada hora en el servidor. Si un retardo exacto falta, el modelo lo recibe como faltante. Una caída del proveedor conserva la fecha de la última medición guardada.

El artefacto `modelo/air_byte_pm25_horario.joblib` contiene un modelo por horizonte, entrenado con objetivos anteriores a 2024 y evaluado por separado en 2025. Para regenerarlo:

```powershell
python backend/manage.py entrenar_pronostico_horario --archivo datos/RMCAB/dataset_RMCAB_limpio.csv
```

El comando muestra el MAE y la persistencia por horizonte. El artefacto original para la referencia de Tunal sigue disponible en Histórico.
