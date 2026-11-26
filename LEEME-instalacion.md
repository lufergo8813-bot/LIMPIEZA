# Aseo Airbnb v3: instalación de la sincronización

## 1. Servidor (Google Apps Script), una sola vez
1. Abre tu proyecto de Apps Script actual (el que envía los correos). **Antes de cambiar nada, copia el código actual a un archivo aparte como respaldo.**
2. Reemplaza el código por el de `enviar-reportes.gs` y guarda.
3. Arriba, elige la función `configurar` y toca **Ejecutar**. Acepta los permisos (Hojas de cálculo).
   En el **Registro de ejecución** aparecen la **CLAVE DEL EQUIPO** y el enlace a la hoja "Aseo Airbnb - Datos sincronizados".
4. Ve a **Implementar → Administrar implementaciones → lápiz (Editar) → Versión: Nueva versión → Implementar**.
   Así se conserva el mismo enlace `/exec`. El acceso debe ser "Cualquier persona".
   Si haces una implementación *nueva*, el enlace cambia y la app de consentimiento de bicicletas dejaría de enviar.

## 2. Publicar la app
Sube `index.html`, `service-worker.js`, `manifest.json` y las imágenes al mismo sitio donde está hoy la app y reemplaza los archivos.
La app se actualiza sola en los celulares la próxima vez que la abran con internet.

## 3. Primer ingreso (administradora)
1. Abre la app → **Administradora 1** → clave **8888** (o la clave que ya usaban).
2. **Ajustes → Sincronización:** confirma el enlace del servidor y pega la **clave del equipo**. Debe decir "Sincronizado".
3. **Ajustes → Usuarios:** pon los nombres reales de las 2 administradoras, agrega al personal de aseo y de mantenimiento con su rol y cambia la clave 8888.
4. Toca **Compartir conexión con el equipo** y envía el mensaje por WhatsApp a cada persona.

## 4. Cada trabajador
- Abre el enlace recibido, toca su nombre y **Agregar a pantalla de inicio**.
- Si ya tenía la app instalada: abre la app y pega el código en "Conectar este celular al equipo".

## Cómo funciona
- Cada celular guarda todo localmente y sincroniza al abrir la app, cada minuto y después de cada cambio. Sin internet sigue funcionando.
- Las fotos y las firmas **no** se suben a la hoja (límite de tamaño de Google Sheets): quedan en el celular y se siguen enviando en los PDF y al compartir.
- La pestaña **Tareas** de la hoja de Google se actualiza sola con materiales, mano de obra y totales.
