# Cambios

## 1.2.0 — Clepit Gestión de Boletas (en revisión)

Incluye la 1.1.2 (lectura de supermercados y baja de trabajadores con RUT).

### Corregido
- El IVA se calculaba siempre al 19%, también en combustible y documentos exentos.
- El IVA leído en la foto se guardaba solo como texto y no se usaba.
- No se podía registrar el comercio desde la app.
- Dos comercios con la misma numeración chocaban, y dos envíos simultáneos podían duplicar una boleta.
- El Excel dejaba vacío el motivo de rechazo.
- Un mes en curso se comparaba con el mes anterior completo.
- La hora de registro se mostraba con 3 o 4 horas de diferencia.
- Un tipo de gasto inexistente respondía error interno.
- Con el mismo correo en dos empresas no se podía entrar con contraseña.
- Una base nueva no se podía crear desde las migraciones.
- Recargar la web cerraba la sesión.

### Nuevo
- Lectura del timbre electrónico del SII y lectura en la web.
- Un solo formulario para escanear o escribir, con el estado de cada dato.
- Comercios con RUT, boletas y facturas, presupuestos, revisión en lote y listado por páginas.
- Aviso de boletas parecidas, de foto repetida y de monto alto.
- Reportes por comercio y persona, y Excel con RUT, documento y origen del IVA.
- Diseño nuevo con la identidad de Clepit y versión de escritorio.
- Publicación con Docker en `boletas.clepit.cl`, migraciones registradas y verificaciones en GitHub.
