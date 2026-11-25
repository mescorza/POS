# proveedores_mantenedor — Especificación del Mantenedor de Proveedores

| | |
|---|---|
| **Dominio** | `proveedor` |
| **Spec** | `proveedores_mantenedor` (deriva de `ESP_PRV_001.docx`, pantalla legacy SAAD302) |
| **Menú** | `01 Maestros Centrales` → `01 Mantenedor de Proveedores` (hoy "Pendiente" en `MainMenuPage`) |
| **Estado** | BORRADOR v0.4 — consulta, pop-ups, edición, alta, control de duplicados y baja/reactivación (F6) construidos; pendiente probar en pantalla y decidir los puntos abiertos de §12 |

## 0. Decisiones tomadas (v0.2) — mandan sobre el resto del documento

1. **Se avanza paso a paso.** Primero **consulta y mostrar datos**; alta, edición, baja y alta rápida de maestros después, cuando se pida.
2. **Validaciones de negocio: (a) dígito verificador, solo si País = Chile (alta y mantención); (b) control de duplicados — ver §0 #7.** No se valida el formato de la abreviación ni hay campos obligatorios por regla (solo los técnicos de la tabla).
7. **Control de duplicados (v0.3):** `NroRut` y `CodProveedor` (Abrev) **no pueden repetirse** entre proveedores. Reglas exactas:
   - **NroRut:** se compara solo el **número** (sin el dígito verificador). Se controla en el **alta** y en la **mantención solo si el RUT fue modificado** (se excluye al propio proveedor).
   - **CodProveedor (Abrev):** se compara sin distinguir mayúsculas ni espacios (`' n0077 '` = `N0077`). Se controla en el **alta**; en mantención no se edita, así que no se vuelve a controlar.
   - **Respuesta:** HTTP `409` con el mensaje que nombra al proveedor que ya lo usa, p. ej. `R.U.T. 45 ya existe: MARS TR DIS TIC.LTD.STI. (Abrev I0077)` o `Abrev N9999 ya existe: CORPORACION URRACAS (R.U.T. 70046700-7)`. La pantalla lo muestra al presionar `F5`.
   - **Datos históricos:** hoy no hay RUT repetidos, pero **sí una abreviación duplicada: `N9999`** (proveedores 5977 y 5019). No se corrige sola; como la Abrev no se edita, ambos siguen pudiendo editarse (probado). Pendiente decidir con Compras cuál conserva `N9999`.
   - **Garantía a nivel de base:** el control es de aplicación. Dos altas simultáneas podrían colarse; la garantía total es un índice único (`UNIQUE` en `nrorut` y en `upper(trim(codproveedor))`), que hoy no se puede crear por el duplicado `N9999`. **[DECIDIR #17]**
3. **Datos sin tabla/columna** (Categoría, Clasificación, Cuenta Contable): se muestran **en blanco**. Condiciones de pago se muestra tal como viene en `pos.proveedor`. Cuando se pida, se agregan.
4. **Campos obligatorios en alta se completan con valores por defecto** (en vez de exigirlos): Localidad = **771**; Provincia vacía = **725**; C.Postal, Fax y Cargo = **un par de blancos**. Verificado en la base: `pos.provincia 725` = "SIN VALOR" (pertenece a la región 710) y `pos.localidad 771` = "-SIN ASIGNAR-" (comuna 0). Ninguno está usado hoy en `pos.proveedor`. Ojo: por pertenecer a otra región/comuna, la consulta con filtro por padre los dejará con descripción en blanco; al construir el alta hay que resolver estos dos defaults sin el filtro por padre (§12 #16).
5. Se mantiene la UI/UX de las pantallas ya construidas.
6. **Los pop-ups de lookup solo BUSCAN y SELECCIONAR.** Nunca crean ni modifican maestros: esos registros se mantienen en otras opciones del menú principal. Por eso quedan **anuladas** §1 punto 6, §6.3 ("crear nuevo"), el `POST /maestros/:tipo` de §9, la etapa 6 de §11 y las decisiones #7 y #8 de §12.

Con esto quedan **resueltas o anuladas** las decisiones §12 #3, #5, #6, #9 (solo DV si Chile), #10, #11; las demás siguen abiertas para etapas futuras.

### Avance de construcción
- ✅ Etapa 1 — backend `GET /proveedores?q=&page=&size=` y `GET /proveedores/:id` (`src/lib/Proveedor/`).
- ✅ Etapa 3 (parcial) — `ProveedorMaintenancePage`: lista paginada en servidor, búsqueda `F2` por RUT / nombre / abreviación, modo consulta en 2 páginas (AvPág/RePág). Conectada al menú `01 → 01`.
- ✅ Etapa 2 — `GET /maestros/:tipo?q=&parent=&page=&size=` (solo lectura: sucursal, pais, region, ciudad, comuna, localidad, provincia, moneda) y componente reutilizable `PosLookupPopup`. En el formulario, `Enter` sobre un campo código (Ubicac., País, Región, Ciudad, Comuna, Localidad, Provincia, Moneda) abre el pop-up filtrado por su padre. En modo lectura, la selección solo se informa y no modifica el proveedor; asignará el valor cuando exista alta/edición.
- ✅ Etapa 4 (edición) — `PUT /proveedores/:id` y modo edición en la pantalla (detalle abajo).
- ✅ Etapa 4b (alta) — `POST /proveedores` y modo alta en la pantalla (detalle abajo).
- ✅ Etapa 5 (baja/reactivación, F6) — `PUT /proveedores/:id/estado` y confirmación en pantalla (§8.2).
- Cond. Pago no tiene pop-up (no existe tabla maestra).

### Alta (construido)
- **Flujo:** `F3` Nuevo (desde la lista o desde un proveedor en lectura) → formulario vacío "ALTA / CREACIÓN" → `F5` crea y deja el proveedor nuevo en lectura, seleccionado en la lista (se limpia cualquier filtro de búsqueda). `Esc`/`F9` cancelan; si hay datos ingresados pide confirmar el descarte.
- **Precargado al abrir:** Ubicación `0 CENTRO DISTRIBUCION`, Localidad `771 -SIN ASIGNAR-`, Provincia `725 SIN VALOR`, Fecha Incorp. = hoy. Si el usuario cambia la Región (o el País), Provincia y Localidad se limpian como cualquier hijo y el backend los **vuelve a completar con 725 / 771 al grabar**.
- **Defaults al grabar (backend):** Localidad vacía → `771`; Provincia vacía → `725`; C.Postal, Fax y Cargo vacíos → un par de blancos.
- **Obligatorios (solo los técnicos):** R.U.T., DV, Nombre, Abrev y Ubicación (columnas NOT NULL). País, Región, Ciudad, Comuna, Dirección, Fono, Contacto, etc. pueden quedar vacíos (se guardan `NULL`).
- **Abrev:** editable solo en el alta, se guarda en mayúsculas, máx. 10 caracteres. Sin validación de formato; **única** (§0 #7).
- **Validación de negocio:** solo el DV chileno cuando País = CHILE (igual que en edición; la lógica es la misma, compartida en `ProveedorEntrada.ts`).
- **Campos automáticos:** `proveedor_id` lo asigna la base (identity); `fecha_creacion` y `fecha_ultima_modificacion` = ahora; `propietario` y `modificado_por` = usuario de la sesión; `estado` = 0; `esinactivo` = false.
- **Quedan en `NULL` al crear** (el formulario no los captura): Cond. de Pago (código y descripción), Moneda y Forwarder si no se eligen, contactos/fonos 2 y 3, anexos, `nrodepto`.
- **Control de duplicados** de NroRut y Abrev (§0 #7): si ya existe, el alta se rechaza con `409` y no se crea nada.

### Modo edición (construido)
- **Flujo:** lista → Enter (lectura) → `F4` (mantención) → `F5` guarda y vuelve a lectura; la lista se recarga y deja seleccionado el mismo proveedor. `Esc`/`F9` cancelan; si hay cambios pide confirmar el descarte (`Enter` = Sí, `Esc` = No).
- **Campos editables:** R.U.T. y DV, Nombre, Ubicación, País, Región, Ciudad, Comuna, Localidad, Provincia (por pop-up), C.Postal, Dirección, Fono, Fax, Contacto, Cargo, Moneda (pop-up), Es Forwarder (`S`/`N`, `Supr` borra), A la orden de, E-Mail 1 y 2.
- **No editables:** Abrev (código AR; solo se fija en el alta), Fecha Incorp., Categoría, Clasificación, Cond. Pago y Cuenta Contable.
- **Teclado:** `Enter` avanza al campo siguiente; sobre un campo con maestro abre el pop-up (también `F2` o tipear una tecla, que parte como búsqueda). Al elegir un valor se asigna y se pasa al siguiente campo. Cambiar un padre **limpia sus hijos** (País → Región/Ciudad/Comuna/Localidad/Provincia; Región → Ciudad/Comuna/Localidad/Provincia; Ciudad → Comuna/Localidad; Comuna → Localidad).
- **Validación:** solo el dígito verificador (módulo 11) cuando País = CHILE; el backend responde `400` con el DV correcto. Verificado: los 1.852 proveedores chilenos actuales tienen DV válido, así que no se bloquea ninguna edición existente. Más allá de eso solo hay restricciones técnicas de la tabla: Nombre, R.U.T., DV y Ubicación no pueden quedar vacíos (columnas NOT NULL) y se respetan los largos máximos (Nombre 40, Dirección 30, Fono/Fax/C.Postal 15, Contacto 25, Cargo 20, A la orden/E-Mail 50).
- **Guardado parcial:** el `UPDATE` solo escribe las columnas del formulario más `fecha_ultima_modificacion` y `modificado_por` (= usuario de la sesión). No toca Abrev, Cond. Pago, contactos/fonos 2 y 3, anexos, `nrodepto`, `fecha_creacion`, `estado` ni `esinactivo`. Campos de texto vacíos se guardan como `NULL`.
- **Dirección:** va entera en `calle` (máx. 30); `nrocalle` queda en `NULL` (en los datos reales ninguna fila lo usa). Resuelve la decisión #4.
- **Defaults 771 / 725:** al *mostrar*, Localidad 771 y Provincia 725 se resuelven sin filtrar por padre (ya funciona). Se asignan como valor por defecto recién en el alta.
- **Sin control de concurrencia** (#13): si dos personas editan el mismo proveedor, gana el último que guarda.
- **RUT editable en mantención:** si se cambia, se controla que no lo use otro proveedor (§0 #7).
| **Tabla principal** | `pos.proveedor` (2.066 filas) |

> Las secciones marcadas **[DECIDIR]** son preguntas abiertas; hay una lista consolidada en §12.

---

## 1. Alcance

**Incluye (v1)**
1. Buscar y mostrar un proveedor por **RUT** o por **nombre / abreviación**.
2. Crear un proveedor nuevo.
3. Editar un proveedor existente (modo consulta → F4 → modo edición).
4. Baja lógica y reactivación.
5. Lookups con ventana pop-up para cada campo codificado: Ubicación, País, Región, Ciudad, Comuna, Localidad, Provincia, Condición de Pago y Moneda. Categoría y Clasificación quedan en **[DECIDIR]** (§12).
6. ~~Crear maestros desde el pop-up~~ — **anulado (§0 #6)**: el pop-up solo busca y selecciona.

**Fuera de alcance (v1)**: asociación proveedor↔artículos, órdenes de compra, contabilización, sincronización NetSuite, y los datos secundarios de `pos.proveedor` (contactos 2/3, fonos 2/3, anexos, `nrodepto`) — se **preservan** al editar pero no se muestran (§8.3).

---

## 2. Principios de UI/UX (se mantiene lo ya construido)

No se inventa un patrón nuevo: se reutiliza el de `UserMaintenancePage` / `EmployeListPage`.

- Kit visual: `PosTerminalShell`, `PosField`, `PosFunctionKeyBar`, `usePosFocus`, tema `pos-terminal.css` (fondo negro, texto verde, monoespaciado).
- Operación 100 % por teclado, sin diálogos nativos del navegador (confirmaciones dentro de la ventana).
- Dos modos: **BROWSING** (lista paginada, `PAGE_SIZE = 15`) y **FORM** con sub-modos `create` / `view` (solo lectura) / `edit`.
- Encabezado de formulario: `ADRIAZOLA REPUESTOS` · `MANTENCIÓN DE PROVEEDORES` · estado `ALTA / CREACIÓN`, `LECTURA` o `MANTENCIÓN`.
- Mismas teclas que Usuarios/Empleados: `F2` Buscar, `F3` Nuevo, `F4` Editar, `F5` Guardar, `F6` Inactivar, `F9` Volver, `Esc` Cancelar, `↑↓`, `AvPág/RePág`, `Inicio/Fin`.
- Código nuevo: `modules/proveedor/ui/react/…` y `modules/proveedor/infrastructure/ProveedorHttpGateway.ts`, igual que `modules/employe/`.

---

## 3. Flujo de pantallas

```
Menú 01 Maestros → 01 Proveedores
        │
        ▼
 ┌───────────────────────┐   F3          ┌──────────────────────────┐
 │ BROWSING (lista)      │──────────────▶│ FORM create              │
 │ + búsqueda F2         │               │  Pág.1 Identificación    │
 │                       │   Enter/F4    │  Pág.2 Cond. Comerciales │
 │                       │──────────────▶│ FORM view (solo lectura) │
 └───────────────────────┘               │      │ F4                │
        ▲   Esc / F9                     │      ▼                   │
        └────────────────────────────────│ FORM edit  ── F5 Guardar │
                                         └──────────────────────────┘
```

El documento original tiene **dos pantallas SAAD302** (Identificación y Dirección / Condiciones Comerciales). Propuesta: un solo formulario con **dos páginas** y `AvPág` / `RePág` para alternar entre ellas (dentro del formulario esas teclas no se usan para otra cosa). **[DECIDIR #1]**

### 3.1 Listado / búsqueda (BROWSING)

Columnas: `Abrev` · `RUT` · `Nombre` · `País` · `Estado` (ACTIVO / INACTIVO).

Búsqueda `F2` (incremental, mismo comportamiento que Empleados): una sola caja que busca en **RUT**, **razón social** y **abreviación** (contiene, sin distinguir mayúsculas). Si se escribe algo con forma de RUT (`12345678-9`, con o sin puntos) se busca por `nrorut`.

Con 2.066 registros el filtrado va **en servidor** (`GET /proveedores?q=`), no se carga todo el universo en el cliente como hoy hace Empleados. **[DECIDIR #2]**

Atajo pedido: si la búsqueda arroja **exactamente 1 resultado** y se presiona Enter, abre directo en modo consulta.

---

## 4. Pantalla 1 — Identificación y Dirección

```
ADRIAZOLA REPUESTOS       MANTENCIÓN DE PROVEEDORES             POS TIENDA
                                                                 LECTURA
--------------------------------------------------------------------------
Nro R.U.T.  [ 76123456 - 7 ]  Ubicac. [ 000 ] CENTRO DISTRIBUCION
Fecha Incorp [ 24/11/2026 ]
Nombre      [ ________________________________________ ] Abrev [ N0077 ]
Categoría   [ __ ] ______________________________        (ver §12)
Clasific.   [ __ ] ______________________________        (ver §12)
País        [ ___ ] CHILE
Región      [ ___ ] ______________________
Ciudad      [ ___ ] ______________________
Comuna      [ ___ ] ______________________
Localidad   [ ___ ] ______________________
Provincia   [ ___ ] ______________________
C.Postal    [ _______________ ]
Dirección   [ ________________________________________ ]
Fono        [ _______________ ]       Fax [ _______________ ]
Contacto    [ _________________________ ]  Cargo [ ____________________ ]
--------------------------------------------------------------------------
F2 Buscar  F3 Nuevo  F4 Editar  F6 Inactivar  F9 Volver  Esc Cancelar
```

### 4.1 Campos

| # | Campo (UI) | Columna `pos.proveedor` | Tipo / largo real | Edición | Notas |
|---|---|---|---|---|---|
| 1 | Nro R.U.T. | `nrorut` + `verificador` | numeric / char(1) | Solo en alta | Ver validación V1. Clave de negocio única. |
| 2 | Ubicac. | `codsucursal` → `pos.sucursal.codsucursal` | smallint | Sí | Default `0` = CENTRO DISTRIBUCION. Lookup. |
| 3 | Fecha Incorp. | `fecha_creacion` | timestamp | **Nunca** | Solo lectura, la pone el sistema. |
| 4 | Nombre | `razonsocial` | char(40) | Sí | Máx. 40 caracteres. |
| 5 | Abrev | `codproveedor` | char(10) | Solo en alta | Único. Ver V2. |
| 6 | Categoría | — | — | — | **No existe columna.** [DECIDIR #3] |
| 7 | Clasific. | — | — | — | **No existe columna.** [DECIDIR #3] |
| 8 | País | `pais_id` → `pos.pais` | integer | Sí | Lookup. |
| 9 | Región | `region_id` → `pos.region` | integer | Sí | Lookup filtrado por País. |
| 10 | Ciudad | `ciudad_id` → `pos.ciudad` | integer | Sí | Filtrado por Región. |
| 11 | Comuna | `comuna_id` → `pos.comuna` | integer | Sí | Filtrado por Ciudad. |
| 12 | Localidad | `localidad_id` → `pos.localidad` | **char(3)** | Sí | Filtrado por Comuna. Ver nota de tipo §10. |
| 13 | Provincia | `provincia_id` → `pos.provincia` | integer | Sí | Filtrado por Región. |
| 14 | C.Postal | `codpostal` | char(15) | Sí | Numérico según el doc. |
| 15 | Dirección | `calle` + `nrocalle` | char(30) + char(6) | Sí | Un solo campo en pantalla; ver nota abajo. |
| 16 | Fono | `fono1` | char(15) | Sí | |
| 17 | Fax | `fax1` | char(15) | Sí | |
| 18 | Contacto | `contacto1` | char(25) | Sí | |
| 19 | Cargo | `cargo1` | char(20) | Sí | |

**Dirección:** la consulta original concatena `calle || ' ' || nrocalle` para mostrar. Al **guardar** hay que decidir cómo se parte: o se agrega un campo `Nro` separado (recomendado, 6 caracteres), o se guarda todo en `calle` (30 car.) y se deja `nrocalle` vacío. **[DECIDIR #4]**

### 4.2 Navegación entre campos

`Enter`/`Tab` avanza al siguiente campo; `Shift+Tab` retrocede. En un campo con lookup, al posicionarse y presionar `F2` (o al avanzar con el campo vacío) se abre el pop-up (§6). Si el código escrito ya existe, se completa la descripción sin abrir pop-up.

---

## 5. Pantalla 2 — Condiciones Comerciales

```
Nro R.U.T.  [ 76123456 - 7 ]  [ NOMBRE DEL PROVEEDOR ]   (solo lectura)
Cond.Pago   [ 001 ] [ ________________________ ]
Cod. Moneda [ 02  ] [ EURO ]
Es Forwarder? [ N ]
A la orden de [ __________________________________________________ ]
Direc. E-Mail 1 [ __________________________________________________ ]
Direc. E-Mail 2 [ __________________________________________________ ]
Cuenta Contable [ ________ ] ______________________________   (ver §12)
```

| Campo (UI) | Columna | Tipo real | Notas |
|---|---|---|---|
| Nro R.U.T. / Nombre | `nrorut`, `verificador`, `razonsocial` | | Solo lectura (encabezado de contexto). |
| Cond.Pago | `codcondpago` + `condicionpago` | char(6) + char(30) | **No existe tabla maestra** de condiciones de pago; la descripción está desnormalizada en cada proveedor. [DECIDIR #5] |
| Cod. Moneda | `codmoneda` → `pos.moneda.moneda_id` | char(2) | Maestro real: `0 PESO`, `1 DOLAR`, `2 EURO`, `3 SIN INFOR`. |
| Es Forwarder | `indforwarder` | char(1) | La base guarda **`S` / `N`** (74 `S`, 1.992 `N`); el documento decía `'1'/'0'`. Se respeta `S/N`. |
| A la orden de | `alaorden` | char(50) | Texto libre. |
| E-Mail 1 / 2 | `email1`, `email2` | char(50) | Validar formato si no está vacío. |
| Cuenta Contable | — | — | **No existe columna ni tabla.** [DECIDIR #6] |

---

## 6. Ventanas de lookup (pop-up)

### 6.1 Patrón único (mismo para los 9 maestros)

Ventana modal centrada sobre el formulario, mismo marco visual terminal, con el código **visible** (el pop-up de SAAD835 lo ocultaba; el doc pide mostrarlo):

```
+-- Ubicaciones -----------------+
| Buscar [______________]        |
| Cod  Descripcion               |
| ---  ------------------------  |
|>000  CENTRO DISTRIBUCION       |
| 013  GRAN AVENIDA              |
| 015  10/JUL 391                |
| ...                            |
| Enter=Selecciona  F3=Nuevo     |
| Esc=Cancela                    |
+--------------------------------+
```

- `Buscar` filtra por código o descripción mientras se escribe.
- `↑↓`, `AvPág/RePág`, `Inicio/Fin` para recorrer; `Enter` selecciona (código al campo, descripción al lado); `Esc` cierra sin cambios.
- Muestra solo registros **activos**; los inactivos no se ofrecen en alta, pero sí se muestran (marcados) si el proveedor ya los tiene asignados.
- Los maestros dependientes se **filtran por el padre** ya elegido (Región por País, Ciudad por Región, Comuna por Ciudad, Localidad por Comuna, Provincia por Región). Al cambiar el padre se limpian los hijos.

### 6.2 Maestros y su origen

| Lookup | Tabla | Clave | Descripción | Hijo de | Registros |
|---|---|---|---|---|---|
| Ubicación | `pos.sucursal` | `codsucursal` | `descsucursal` (`esinactiva=false`) | — | 6 |
| País | `pos.pais` | `pais_id` | `nombre` | — | 29 |
| Región | `pos.region` | `region_id` | `nombre` | País | 77 |
| Ciudad | `pos.ciudad` | `ciudad_id` | `nombre` | Región | 364 |
| Comuna | `pos.comuna` | `comuna_id` | `nombre` | Ciudad | 2.564 |
| Localidad | `pos.localidad` | `localidad_id` | `nombre` | Comuna | 771 |
| Provincia | `pos.provincia` | `provincia_id` | `nombre` | Región | 363 |
| Moneda | `pos.moneda` | `moneda_id` | `nombre` | — | 4 |
| Cond. Pago | (sin tabla) | `codcondpago` | `condicionpago` | — | ver §12 |

**Excepción: Provincia por Región.** `pos.provincia.region_id` **no** referencia `pos.region.region_id` sino `pos.region.externalid` (p. ej. las provincias con `region_id = 206` son las de Valparaíso, cuyo `externalid` es 206; 254 de las 363 provincias coinciden así y ninguna por `region_id`). Por eso el filtro del pop-up de Provincia es `provincia.region_id::text = región.externalid`, y la provincia **725 "SIN VALOR"** se ofrece siempre como comodín (igual que al mostrar el proveedor). La descripción de la provincia en el detalle usa la misma regla. Corregido en v0.5: antes el pop-up salía vacío para toda región. Las 34 regiones sin provincias por `externalid` solo ofrecen el comodín.

### 6.3 Solo buscar y seleccionar (decisión §0 #6)

El pop-up **no crea ni modifica** registros. Si lo buscado no existe, muestra `Sin resultados para "xxx"` y el usuario cancela con `Esc`; el maestro se da de alta en su propia opción del menú principal (pendiente de construir). En el pop-up: escribir filtra (por descripción o código), `↑↓`/`AvPág`/`RePág`/`Inicio`/`Fin` recorren, `Enter` selecciona, `Esc` cancela.

---

## 7. Validaciones

| ID | Regla | Cuándo | Mensaje (propuesto) |
|---|---|---|---|
| V0 | Obligatorios en alta: RUT, Ubicación, Nombre, Abrev, País, Región, Ciudad, Comuna, Dirección. Fecha Incorp. la pone el sistema. | F5 | `Campo obligatorio: <campo>` |
| V1 | **Dígito verificador (módulo 11 Chile)** del RUT. | Al salir del campo DV y en F5 | `RUT inválido` |
| V1b | ✅ **Construido (v0.3, §0 #7).** NroRut único (solo el número, sin DV). | F5 | `R.U.T. <n> ya existe: <nombre> (Abrev <x>)` — 409 |
| V2 | ✅ **Unicidad construida (§0 #7).** Abrev única, sin distinguir mayúsculas/espacios. El **formato** `I`/`N` + dígitos sigue sin validarse. | F5 | `Abrev <x> ya existe: <nombre> (R.U.T. <n>)` — 409 |
| V3 | Dirección, Teléfono y Contacto obligatorios. | F5 | `Dirección/Teléfono/Contacto obligatorios` |
| V4 | Cuenta contable imputable y registrada. | F5 | `Cuenta no imputable / no registrada` — **bloqueada hasta resolver #6** |
| V5 | Largos máximos según la columna (§4/§5). | Al tipear | no deja pasar del máximo |
| V6 | Email con formato válido (si viene). | F5 | `E-mail inválido` |

### Hallazgos de datos reales que obligan a ajustar la regla del documento

Consulté `pos.proveedor` para validar las reglas contra la realidad:

- **V1 / RUT extranjero.** Los proveedores `I…` (internacionales, 220 filas) no tienen RUT chileno real (ej.: `45-0` para un proveedor de Turquía). Aplicar módulo 11 a todos impediría crearlos. **Propuesta:** V1 solo aplica cuando **País = CHILE**; para extranjeros se pide un identificador libre (`nrorut` numérico + DV libre). **[DECIDIR #9]**
- **V2 / formato de Abrev.** El documento dice "letra + 3 números" (`Nnnn`); en la base el 88 % tiene **letra + 4 dígitos** (`N0077`, `I0081`) y hay valores de 4, 6, 7 y 8 caracteres. **Propuesta:** `^[IN][0-9]{4}$` para altas nuevas; los existentes no se tocan. **[DECIDIR #10]**
- **V2 / unicidad.** Hoy no hay restricción única en la base y existe **1 abreviación duplicada**; la restricción habría que agregarla (índice único) tras limpiar ese caso.
- **V0 / obligatoriedad.** El documento exige Localidad, Provincia, Código Postal, Fax y Cargo, pero en los datos reales vienen vacíos en 67 %, 72 %, 97 %, 78 % y ~48 % de los casos respectivamente. **Propuesta:** hacer obligatorios solo los marcados en V0 arriba, y dejar Localidad, Provincia, C.Postal, Fax y Cargo **opcionales**. **[DECIDIR #11]**

---

## 8. Reglas de negocio

### 8.1 Alta
- `proveedor_id` lo asigna la secuencia `pos.proveedor_proveedor_id_seq` (ya existe; máximo actual 6198). No lo genera el cliente (a diferencia de `Date.now()` en Usuarios/Empleados).
- `fecha_creacion` y `fecha_ultima_modificacion` = ahora; `modificado_por` y `propietario` = id del usuario de la sesión; `estado` = 0; `esinactivo` = false.
- `codsucursal` por defecto = 0.

### 8.2 Baja lógica (F6) — ✅ construido (v0.4)
- **Nunca se borra físicamente.** Solo se cambia `esinactivo` (`true` = inactivo). `NULL` y `false` se tratan como activo.
- **Dónde:** `F6` en la **lista** (sobre el proveedor seleccionado) y en la **lectura** del proveedor abierto. No está disponible en edición ni en alta. La etiqueta de la barra alterna según el estado: `F6 Desactivar` / `F6 Reactivar`.
- **Confirmación dentro de la ventana** (sin diálogos nativos): `¿Desea Desactivar Proveedor "NOMBRE"? Enter = Sí, Esc = No` o `¿Desea Reactivar Proveedor "NOMBRE"? …`. Tras confirmar muestra `Proveedor desactivado.` / `Proveedor reactivado.`, la lista se recarga y deja seleccionado el mismo proveedor.
- **Qué se escribe:** solo `esinactivo`, `fecha_ultima_modificacion` y `modificado_por` (usuario de la sesión). Nada más se toca.
- **API:** `PUT /proveedores/:id/estado` con `{ inactivo: boolean, modificadoPor }`. Es idempotente (pedir el estado que ya tiene no falla); `400` si `inactivo` no es booleano, falta el usuario o el id es inválido; `404` si no existe.
- **Lectura de un inactivo:** al abrirlo muestra `Proveedor está Inactivo`; en la lista aparece como `INACTIVO`. Sigue siendo **consultable y editable**: la baja no bloquea la mantención.
- **Pendiente (cuando existan otras pantallas):** un proveedor inactivo no debe ofrecerse en los lookups de otras pantallas (órdenes de compra, artículos, etc.), pero sí seguir siendo consultable. Hoy no hay ninguna que lo consuma.
- `esinactivo` es `NULL` en las 2.066 filas existentes; se interpreta como activo y se escribe `false`/`true` solo al alta o al cambiar el estado. **[DECIDIR #12]** si se normaliza el `NULL` a `false` con una migración.

### 8.3 Edición sin pérdida de datos
Mismo riesgo ya vivido en Usuarios/Empleados: el `UPDATE` no debe pisar columnas que la pantalla no muestra (contactos 2/3, fonos 2/3, anexos, fax 2/3, `nrodepto`). **El `UPDATE` solo escribe las columnas del formulario**, o bien se lee el registro completo antes y se reenvía (patrón actual). Se recomienda lo primero (UPDATE parcial).

### 8.4 Concurrencia
Se actualiza `fecha_ultima_modificacion`. Control optimista comparando ese timestamp (`409` si cambió desde que se abrió) — ya pendiente en `ESTADO_CONSTRUIDO.md` §11. **[DECIDIR #13]** incluirlo en v1.

---

## 9. Arquitectura y API

Sigue la arquitectura hexagonal de `docs/ARCHITECTURE.md`:

```
src/lib/Proveedor/
  domain/        entities/Proveedor.ts, value-objects/ (Rut, CodigoProveedor, …),
                 repositories/ProveedorRepository.ts, errors (RutInvalido, AbrevDuplicada…)
  application/   use-cases/ ProveedorSearch, ProveedorGetOneById, ProveedorCreate,
                 ProveedorEdit, ProveedorSetActive
  infrastructure/ PostgresProveedorRepository.ts, InMemoryProveedorRepository.ts,
                 ExpressProveedorRouter.ts, ExpressProveedorController.ts
src/lib/Shared/infrastructure/   ExpressMaestroRouter + MaestroRepository (lookups geográficos, moneda, sucursal)
modules/proveedor/               ui/react/ProveedorMaintenancePage.tsx, ProveedorHttpGateway.ts
shared/ui/pos-terminal/          PosLookupPopup.tsx  (componente nuevo, reutilizable)
```

Todo el SQL debe ir **calificado con el esquema `pos.`**, porque los repositorios actuales (`user_pos`, `employee`) viven en `public`.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/proveedores?q=&page=&size=` | Búsqueda por RUT / nombre / abreviación |
| GET | `/proveedores/:id` | Detalle completo (con descripciones resueltas) |
| POST | `/proveedores` | Alta |
| PUT | `/proveedores/:id` | Edición |
| PUT | `/proveedores/:id/estado` | Desactivar / reactivar |
| GET | `/maestros/:tipo?q=&parent=&page=&size=` | Lookup de solo lectura (`sucursal`, `pais`, `region`, `ciudad`, `comuna`, `localidad`, `provincia`, `moneda`) |

`PosLookupPopup` es **un solo componente** parametrizado (título, columnas, fuente de datos, filtro padre), que cubre los 9 lookups. Vite necesita agregar `/proveedores` y `/maestros` al proxy de `vite.config.ts`.

La consulta de detalle es la del documento, pero reescrita con `JOIN`s (el original usa subselects por columna, ineficiente) y sin `max()`.

---

## 10. Observaciones sobre la calidad de los datos existentes

Para que nadie se sorprenda al probar con datos reales:

1. **Padding:** los `char(n)` rellenan con espacios (`'MARS TR DIS TIC.LTD.STI.        '`). Se hace `trim()` al leer; al guardar se envía sin relleno.
2. **Referencias huérfanas:** 88 proveedores apuntan a un `pais_id` y 258 a un `region_id` que **no existen** en `pos.pais` / `pos.region` (p. ej. `pais_id = 1010`, `region_id = 99` en el proveedor turco; parecen códigos legacy/SAAD distintos de los ids actuales). El mantenedor debe mostrar `(código sin descripción)` en vez de fallar, y exigir corregirlo solo si el usuario edita ese campo. **[DECIDIR #14]** ¿se hace una migración de saneamiento previa?
3. **`localidad_id` es `char(3)`** mientras `pos.localidad.localidad_id` es `integer` → comparación con cast (como ya hacía la consulta original).
4. **Teléfonos con basura** (ej. `9,03323E+11` — número pasado por Excel) y texto en el campo de fono (`3 3480 SILIVRI/`). No se corrige en v1; la validación de fono será solo largo máximo.
5. **`codcondpago`** con inconsistencias (`'SFECTIVO'` vs `'EFECTIVO'` bajo el mismo código `0`).
6. `codsucursal = 0` en las 2.066 filas: en la práctica la Ubicación aún no diferencia nada.

---

## 11. Plan de construcción (propuesto)

| Etapa | Contenido |
|---|---|
| 1 | Backend `Proveedor`: dominio + `PostgresProveedorRepository` + Search/GetOne + tests de integración contra `POS`. |
| 2 | Endpoint `/maestros/:tipo` (lectura) + `PosLookupPopup`. |
| 3 | `ProveedorMaintenancePage`: BROWSING + búsqueda por RUT/nombre/abrev + modo consulta (pág. 1 y 2). |
| 4 | Alta y edición con validaciones V0–V6 (incl. módulo 11). |
| 5 | Baja/reactivación (F6). |
| 6 | ~~Alta rápida de maestros desde el pop-up~~ — anulada (§0 #6). |
| 7 | Conectar la opción `01 → 01` del menú y actualizar `ESTADO_CONSTRUIDO.md`. |

Primer entregable visible (lo que pediste primero): etapas 1–3 → **buscar y mostrar un proveedor por RUT o nombre**, y el pop-up de lookup **buscando si existe**; la creación llega en las etapas 4 y 6.

---

## 12. Decisiones abiertas (para revisar)

| # | Tema | Recomendación |
|---|---|---|
| 1 | Una o dos pantallas (Identificación / Condiciones) | Un formulario, dos páginas con `AvPág/RePág` |
| 2 | Búsqueda en servidor vs. cliente | En servidor (2.066 filas) |
| 3 | **Categoría y Clasificación**: no existen en `pos.proveedor` | Crear tablas maestras + columnas, o dejarlas fuera de v1. Hoy el original las devolvía como `''`. |
| 4 | Guardar Dirección: campo `Nro` separado o todo en `calle` | Campo `Nro` separado |
| 5 | **Condiciones de pago**: no hay tabla maestra | Crear `pos.condicion_pago` poblada con los valores distintos actuales |
| 6 | **Cuenta contable**: no hay columna ni tabla | Fuera de v1 (no se muestra) hasta definir el plan de cuentas |
| 7 | ~~Campos `saad_*` / `externalid` en altas rápidas de geografía~~ | Anulada (§0 #6) |
| 8 | ~~Quién puede crear maestros desde el pop-up~~ | Anulada (§0 #6) |
| 9 | Validar RUT solo si País = Chile | Sí |
| 10 | Formato Abrev `[IN]` + 4 dígitos (vs. 3 del documento) | `^[IN][0-9]{4}$` solo para altas nuevas |
| 11 | Campos obligatorios reales vs. los del documento | Opcionales: Localidad, Provincia, C.Postal, Fax, Cargo |
| 12 | Normalizar `esinactivo` NULL → false | Sí, migración simple |
| 13 | Control de concurrencia optimista en v1 | Sí |
| 14 | Saneamiento previo de `pais_id`/`region_id` huérfanos | Revisar con Compras antes de producción |
| 15 | Roles de "Responsable" del documento (Compras, Contabilidad, Finanzas) | Informativo por ahora; ¿se traduce a permisos por campo? |
| 17 | Índice único en base para NroRut y Abrev (hoy bloqueado por el duplicado `N9999`) y qué proveedor conserva `N9999` | Resolver `N9999` con Compras y luego crear los `UNIQUE` |
| 16 | Defaults al grabar: Localidad = 771, Provincia = 725 (confirmado por el usuario). Existen, pero cuelgan de región 710 / comuna 0, no del padre elegido en el proveedor | Al mostrarlos, buscar el nombre sin filtrar por padre cuando el código sea 771/725 |
