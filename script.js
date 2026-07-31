"use strict";

/*
  REEMPLAZAR ESTOS DOS VALORES CON LOS DATOS DE SUPABASE
*/
const SUPABASE_URL = "https://eovcqndrzpbbhthgmddr.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_KnYkmLAwcRw8ml9APQdbaQ_ngbhMRIg";

/*
  No cambiar desde aquí, salvo que quieras agregar funciones.
*/
const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);

const estado = {
  usuario: null,
  productos: []
};

const elementos = {
  seccionAcceso: document.querySelector("#seccionAcceso"),
  aplicacion: document.querySelector("#aplicacion"),
  formAcceso: document.querySelector("#formAcceso"),
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnRegistrarse: document.querySelector("#btnRegistrarse"),
  btnCerrarSesion: document.querySelector("#btnCerrarSesion"),
  mensajeAcceso: document.querySelector("#mensajeAcceso"),

  formProducto: document.querySelector("#formProducto"),
  productoId: document.querySelector("#productoId"),
  nombre: document.querySelector("#nombre"),
  categoria: document.querySelector("#categoria"),
  marca: document.querySelector("#marca"),
  proveedor: document.querySelector("#proveedor"),
  cantidad: document.querySelector("#cantidad"),
  unidad: document.querySelector("#unidad"),
  precio: document.querySelector("#precio"),
  fechaCompra: document.querySelector("#fechaCompra"),
  observaciones: document.querySelector("#observaciones"),
  mensajeProducto: document.querySelector("#mensajeProducto"),
  tituloFormulario: document.querySelector("#tituloFormulario"),
  btnCancelarEdicion: document.querySelector("#btnCancelarEdicion"),

  tablaProductos: document.querySelector("#tablaProductos"),
  buscador: document.querySelector("#buscador"),
  cantidadProductos: document.querySelector("#cantidadProductos"),
  ultimaActualizacion: document.querySelector("#ultimaActualizacion")
};

document.addEventListener("DOMContentLoaded", iniciarAplicacion);

elementos.formAcceso.addEventListener("submit", iniciarSesion);
elementos.btnRegistrarse.addEventListener("click", registrarUsuario);
elementos.btnCerrarSesion.addEventListener("click", cerrarSesion);
elementos.formProducto.addEventListener("submit", guardarProducto);
elementos.btnCancelarEdicion.addEventListener("click", limpiarFormulario);
elementos.buscador.addEventListener("input", filtrarProductos);

async function iniciarAplicacion() {
  establecerFechaActual();

  const {
    data: { session },
    error
  } = await clienteSupabase.auth.getSession();

  if (error) {
    mostrarMensaje(
      elementos.mensajeAcceso,
      "No se pudo comprobar la sesión.",
      "error"
    );
    return;
  }

  actualizarSesion(session);
}

clienteSupabase.auth.onAuthStateChange((_evento, session) => {
  actualizarSesion(session);
});

async function actualizarSesion(session) {
  estado.usuario = session?.user ?? null;

  if (estado.usuario) {
    elementos.seccionAcceso.classList.add("oculto");
    elementos.aplicacion.classList.remove("oculto");
    elementos.btnCerrarSesion.classList.remove("oculto");

    await cargarProductos();
  } else {
    elementos.seccionAcceso.classList.remove("oculto");
    elementos.aplicacion.classList.add("oculto");
    elementos.btnCerrarSesion.classList.add("oculto");

    estado.productos = [];
  }
}

async function iniciarSesion(evento) {
  evento.preventDefault();

  const email = elementos.email.value.trim();
  const password = elementos.password.value;

  mostrarMensaje(
    elementos.mensajeAcceso,
    "Ingresando...",
    ""
  );

  const { error } = await clienteSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mostrarMensaje(
      elementos.mensajeAcceso,
      traducirError(error.message),
      "error"
    );
    return;
  }

  elementos.formAcceso.reset();

  mostrarMensaje(
    elementos.mensajeAcceso,
    "Sesión iniciada correctamente.",
    "exito"
  );
}

async function registrarUsuario() {
  const email = elementos.email.value.trim();
  const password = elementos.password.value;

  if (!email || password.length < 6) {
    mostrarMensaje(
      elementos.mensajeAcceso,
      "Ingresá un correo y una contraseña de al menos 6 caracteres.",
      "error"
    );
    return;
  }

  mostrarMensaje(
    elementos.mensajeAcceso,
    "Creando cuenta...",
    ""
  );

  const { error } = await clienteSupabase.auth.signUp({
    email,
    password
  });

  if (error) {
    mostrarMensaje(
      elementos.mensajeAcceso,
      traducirError(error.message),
      "error"
    );
    return;
  }

  mostrarMensaje(
    elementos.mensajeAcceso,
    "Cuenta creada. Revisá tu correo si Supabase solicita confirmación.",
    "exito"
  );
}

async function cerrarSesion() {
  const { error } = await clienteSupabase.auth.signOut();

  if (error) {
    alert("No se pudo cerrar la sesión.");
  }
}

async function cargarProductos() {
  elementos.tablaProductos.innerHTML = `
    <tr>
      <td colspan="8" class="sin-resultados">
        Cargando productos...
      </td>
    </tr>
  `;

  const { data, error } = await clienteSupabase
    .from("productos")
    .select("*")
    .order("fecha_compra", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    elementos.tablaProductos.innerHTML = `
      <tr>
        <td colspan="8" class="sin-resultados">
          No se pudieron cargar los productos.
        </td>
      </tr>
    `;

    console.error(error);
    return;
  }

  estado.productos = data ?? [];
  renderizarProductos(estado.productos);
  actualizarResumen();
}

async function guardarProducto(evento) {
  evento.preventDefault();

  if (!estado.usuario) {
    mostrarMensaje(
      elementos.mensajeProducto,
      "Debés iniciar sesión.",
      "error"
    );
    return;
  }

  const cantidad = Number(elementos.cantidad.value);
  const precioTotal = Number(elementos.precio.value);

  if (cantidad <= 0 || precioTotal < 0) {
    mostrarMensaje(
      elementos.mensajeProducto,
      "Revisá la cantidad y el precio ingresados.",
      "error"
    );
    return;
  }

  const producto = {
    user_id: estado.usuario.id,
    nombre: elementos.nombre.value.trim(),
    categoria: elementos.categoria.value,
    marca: elementos.marca.value.trim() || null,
    proveedor: elementos.proveedor.value.trim() || null,
    cantidad,
    unidad: elementos.unidad.value,
    precio_total: precioTotal,
    fecha_compra: elementos.fechaCompra.value,
    observaciones:
      elementos.observaciones.value.trim() || null,
    updated_at: new Date().toISOString()
  };

  const id = elementos.productoId.value;

  mostrarMensaje(
    elementos.mensajeProducto,
    "Guardando...",
    ""
  );

  let respuesta;

  if (id) {
    respuesta = await clienteSupabase
      .from("productos")
      .update(producto)
      .eq("id", id);
  } else {
    respuesta = await clienteSupabase
      .from("productos")
      .insert(producto);
  }

  if (respuesta.error) {
    console.error(respuesta.error);

    mostrarMensaje(
      elementos.mensajeProducto,
      "No se pudo guardar el producto.",
      "error"
    );
    return;
  }

  mostrarMensaje(
    elementos.mensajeProducto,
    id
      ? "Producto actualizado correctamente."
      : "Producto agregado correctamente.",
    "exito"
  );

  limpiarFormulario();
  await cargarProductos();
}

function renderizarProductos(productos) {
  if (!productos.length) {
    elementos.tablaProductos.innerHTML = `
      <tr>
        <td colspan="8" class="sin-resultados">
          No se encontraron productos.
        </td>
      </tr>
    `;
    return;
  }

  elementos.tablaProductos.innerHTML = productos
    .map((producto) => {
      const costoBase = calcularCostoBase(producto);

      return `
        <tr>
          <td>
            <strong>${escaparHTML(producto.nombre)}</strong>
            ${
              producto.marca
                ? `<br><small>${escaparHTML(producto.marca)}</small>`
                : ""
            }
          </td>

          <td>${escaparHTML(producto.categoria)}</td>

          <td>
            ${escaparHTML(producto.proveedor || "Sin especificar")}
          </td>

          <td>
            ${formatearNumero(producto.cantidad)}
            ${escaparHTML(producto.unidad)}
          </td>

          <td>
            ${formatearMoneda(producto.precio_total)}
          </td>

          <td>
            <strong>${costoBase.texto}</strong>
          </td>

          <td>
            ${formatearFecha(producto.fecha_compra)}
          </td>

          <td>
            <div class="acciones-tabla">
              <button
                class="boton-editar"
                type="button"
                onclick="editarProducto('${producto.id}')"
              >
                Editar
              </button>

              <button
                class="boton-peligro"
                type="button"
                onclick="eliminarProducto('${producto.id}')"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function calcularCostoBase(producto) {
  let cantidadBase = Number(producto.cantidad);
  let nombreUnidad = producto.unidad;

  switch (producto.unidad) {
    case "kg":
      nombreUnidad = "kg";
      break;

    case "g":
      cantidadBase = cantidadBase / 1000;
      nombreUnidad = "kg";
      break;

    case "l":
      nombreUnidad = "litro";
      break;

    case "ml":
      cantidadBase = cantidadBase / 1000;
      nombreUnidad = "litro";
      break;

    case "unidad":
      nombreUnidad = "unidad";
      break;

    case "paquete":
      nombreUnidad = "paquete";
      break;
  }

  const costo = Number(producto.precio_total) / cantidadBase;

  return {
    valor: costo,
    texto: `${formatearMoneda(costo)} / ${nombreUnidad}`
  };
}

function editarProducto(id) {
  const producto = estado.productos.find(
    (item) => item.id === id
  );

  if (!producto) return;

  elementos.productoId.value = producto.id;
  elementos.nombre.value = producto.nombre;
  elementos.categoria.value = producto.categoria;
  elementos.marca.value = producto.marca ?? "";
  elementos.proveedor.value = producto.proveedor ?? "";
  elementos.cantidad.value = producto.cantidad;
  elementos.unidad.value = producto.unidad;
  elementos.precio.value = producto.precio_total;
  elementos.fechaCompra.value = producto.fecha_compra;
  elementos.observaciones.value =
    producto.observaciones ?? "";

  elementos.tituloFormulario.textContent = "Editar producto";
  elementos.btnCancelarEdicion.classList.remove("oculto");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function eliminarProducto(id) {
  const producto = estado.productos.find(
    (item) => item.id === id
  );

  if (!producto) return;

  const confirmado = confirm(
    `¿Querés eliminar "${producto.nombre}"?`
  );

  if (!confirmado) return;

  const { error } = await clienteSupabase
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar el producto.");
    console.error(error);
    return;
  }

  await cargarProductos();
}

function limpiarFormulario() {
  elementos.formProducto.reset();
  elementos.productoId.value = "";
  elementos.tituloFormulario.textContent = "Agregar producto";
  elementos.btnCancelarEdicion.classList.add("oculto");

  establecerFechaActual();
}

function filtrarProductos() {
  const termino = elementos.buscador.value
    .trim()
    .toLowerCase();

  if (!termino) {
    renderizarProductos(estado.productos);
    return;
  }

  const resultados = estado.productos.filter((producto) => {
    const contenido = [
      producto.nombre,
      producto.categoria,
      producto.marca,
      producto.proveedor,
      producto.observaciones
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return contenido.includes(termino);
  });

  renderizarProductos(resultados);
}

function actualizarResumen() {
  elementos.cantidadProductos.textContent =
    estado.productos.length;

  if (!estado.productos.length) {
    elementos.ultimaActualizacion.textContent = "Sin datos";
    return;
  }

  const fechas = estado.productos
    .map((producto) => new Date(producto.updated_at))
    .filter((fecha) => !Number.isNaN(fecha.getTime()))
    .sort((a, b) => b - a);

  elementos.ultimaActualizacion.textContent =
    fechas.length
      ? fechas[0].toLocaleDateString("es-AR")
      : "Sin datos";
}

function establecerFechaActual() {
  const hoy = new Date();
  const fechaLocal = new Date(
    hoy.getTime() - hoy.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  elementos.fechaCompra.value = fechaLocal;
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(Number(valor));
}

function formatearNumero(valor) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 3
  }).format(Number(valor));
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";

  return new Date(`${fecha}T00:00:00`).toLocaleDateString(
    "es-AR"
  );
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensaje";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function traducirError(mensaje) {
  const errores = {
    "Invalid login credentials":
      "El correo o la contraseña son incorrectos.",

    "User already registered":
      "Ese correo ya está registrado.",

    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",

    "Email not confirmed":
      "Primero debés confirmar tu correo electrónico."
  };

  return errores[mensaje] || mensaje;
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Estas funciones se exponen para que funcionen
  los botones generados dentro de la tabla.
*/
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;