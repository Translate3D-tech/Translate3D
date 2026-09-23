# Verificación de extremo a extremo de Translate3D

Fecha: 23 de septiembre de 2026. Sitio: https://translate-3d.com. Las pruebas sobre Production fueron de lectura o se detuvieron antes de confirmar un pedido. No se cobró, creó, canceló ni modificó ningún pedido de producción durante esta verificación.

## Resultado por flujo

| Flujo | Resultado | Evidencia y límite |
| --- | --- | --- |
| Inicio y navegación | Verificado | La portada y las cuatro categorías (Modelos 3D, Filamentos, Resinas y Refacciones) cargaron con productos. El catálogo completo mostró cuatro productos. |
| Búsqueda | Verificado | Buscar `resina` abrió resultados y enlazó con la ficha del producto. |
| Fichas de producto | Verificado | Se abrieron un filamento y una resina, con precio y botón para agregar al carrito. El filamento aparece sin imagen: dato de catálogo pendiente. |
| Carrito | Verificado | Se agregaron ambos productos; subtotal MX$610. Aumentar la resina a dos unidades actualizó el subtotal a MX$1,210; al reducirla volvió a MX$610. |
| Paso al checkout | Verificado hasta el pago | Shopify recibió los dos productos y mostró total estimado MX$707.60 antes de calcular envío. No se introdujeron datos personales ni se pulsó “Pagar ahora”. |
| Pago y creación de un pedido nuevo | Bloqueado | Shopify Admin sigue mostrando “Completar configuración” para Shopify Payments y “Configuración incompleta” para PayPal. Que PayPal aparezca en el checkout no demuestra que acepte cobros. |
| Recepción y lectura de pedidos en Shopify Admin | Parcial | Se abrió la lista y el detalle de un pedido de demostración existente (`#1011`). No se creó uno nuevo desde el checkout. |
| Panel administrativo propio | Parcial | La ruta protegida redirige a inicio de sesión; no había una sesión de cliente administrador abierta para comprobar su contenido en vivo. |
| Cambio de estado de pedido | No probado | No se alteró el estado de un pedido real ni de un pedido antiguo de demostración; falta un pedido de prueba nuevo y seguro para hacerlo. |
| Rastreo en la portada | Verificado con pedido existente | Un folio válido del pedido de demostración `#1011` devolvió pedido, pago, total y fecha. Un folio inexistente devolvió un mensaje de error claro. |
| Tarifas de envío | No probado | El checkout pide dirección antes de calcularlas; no se completó una dirección durante esta prueba. |

El rastreador actual compara el folio con los 250 pedidos más recientes. La prueba con un pedido existente pasó, pero no demuestra que funcione para pedidos más antiguos cuando la tienda supere ese volumen; hará falta un índice de folios para eliminar ese límite.

## Defectos encontrados y correcciones

- El panel propio mostraba `ord_` más el ID numérico de Shopify, pero la portada solo acepta el folio seguro de seguimiento. El panel ahora calcula y muestra el mismo folio que usa la cuenta del cliente; el texto de la portada aclara qué dato introducir.
- El rastreador mostraba el envío de un pedido cancelado como “Confirmado”. Ahora consulta la fecha de cancelación y muestra “Pedido cancelado”.
- Algunas pantallas llamaban “Entregado” a un pedido solamente preparado y fabricaban hitos de envío con la fecha de creación. Las etiquetas se ajustaron al estado real de Shopify y se retiraron los hitos sin evidencia.
- Las rutas habituales de Shopify `/products/...` y `/collections/...` respondían 404. Se añadieron redirecciones hacia las rutas personalizadas de `/tienda/...`.

## Para cerrar la prueba completa

1. La titular debe terminar la activación del método de pago elegido en Shopify Admin > Configuración > Pagos. No se debe activar el modo de prueba de pagos en Production mientras haya clientes comprando.
2. En una ventana de pruebas controlada, crear un pedido de prueba con un producto de bajo riesgo y comprobar su número, correo de confirmación y aparición en Shopify Admin. Evitar un cargo real sin una decisión explícita de la titular.
3. Iniciar sesión como cliente administrador en el panel propio; confirmar que el nuevo pedido y su folio aparecen correctamente.
4. Actualizar únicamente el pedido de prueba, comprobar el estado en Shopify Admin, en el panel propio, en la cuenta del cliente y en el rastreador de la portada.
5. Validar con una dirección de prueba aceptable las tarifas de envío antes de confirmar que el checkout completo funciona.

## Comprobaciones técnicas

- `npm run build`: correcto.
- `npm run typecheck`: correcto.
- `npx shopify hydrogen check routes`: todas las rutas estándar presentes después de la corrección.
- `bun run test:shopify`: blog, colecciones y productos accesibles desde Storefront API.
- `npm run lint`: hay errores preexistentes en el repositorio; las comprobaciones de compilación y tipos sí pasan. No se atribuye una aprobación global de ESLint a este cambio.
