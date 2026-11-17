APLICACIÓN MÓVIL DE PARTES DE TRABAJO

Contenido
- Aplicación web instalable (PWA) para Android.
- Funciona sin conexión después de instalarse.
- Guarda los partes en el propio teléfono.
- Exporta siempre los registros en un archivo Excel real (.xlsx).
- Al elegir "Varios" en matrícula permite añadir varias líneas con ruta, matrícula, tipo de camión, horario y kilómetros.
- Conserva automáticamente el parte en curso aunque se cierre la aplicación.
- Envía cada lunes a Soraya un Excel separado por cada móvil, con los partes de ese usuario de la semana anterior.
- Incluye 73 trabajadores y 53 matrículas.

INSTALACIÓN EN ANDROID
1. Publique todos los archivos de esta carpeta en una dirección HTTPS.
   La opción más sencilla es GitHub Pages.
2. Abra esa dirección con Google Chrome en el móvil.
3. Pulse "Instalar" en la cabecera. Si no aparece, use el menú de Chrome
   (tres puntos) > "Añadir a pantalla de inicio" o "Instalar aplicación".
4. La aplicación quedará como un icono normal y funcionará sin conexión.

IMPORTANTE
- Los datos se guardan en el teléfono y se sincronizan con la base de datos central cuando hay conexión.
- Antes de borrar datos de Chrome o cambiar de móvil, también puede usar "Exportar a Excel" como copia adicional.

PRUEBA EN UN ORDENADOR
No abra index.html directamente. Sirva la carpeta con un servidor local HTTPS
o con una plataforma de publicación web. Los service workers no funcionan
desde direcciones file://.
