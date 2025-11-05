let registroUsuarios = [];
let idEnMemoria = null;
const URL_BASE = 'https://fi.jcaguilar.dev/v1/escuela/persona/';

let dialogoFormulario = null;
let indicadorCarga = null;
let formElemento = null;
let cuerpoTabla = null;

window.addEventListener('load', () => {
    dialogoFormulario = document.getElementById('modal-formulario');
    indicadorCarga = document.querySelector('#loader');
    formElemento = document.querySelector('#form-persona');
    cuerpoTabla = document.querySelector('table tbody');

    document.querySelector('#btn-abrir-modal').addEventListener('click', mostrarDialogoNuevo);
    document.querySelector('#btn-cerrar-modal').addEventListener('click', ocultarDialogo);
    formElemento.addEventListener('submit', manejarEnvioFormulario);

    cargarDatosDesdeAPI();
});

async function cargarDatosDesdeAPI() {
    activarSpinner();
    try {
        const response = await fetch(URL_BASE);
        if (!response.ok) throw new Error('No se pudieron leer los datos');
        
        const data = await response.json();
        registroUsuarios = Array.isArray(data) ? data : [];
        dibujarFilasTabla();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('No se pudo obtener la información de los registros.');
    } finally {
        desactivarSpinner();
    }
}

async function manejarEnvioFormulario(evento) {
    evento.preventDefault();
    const datosForm = leerValoresFormulario();

    if (Object.values(datosForm).some(valor => !valor)) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    activarSpinner();

    const esActualizacion = !!idEnMemoria;
    const httpMethod = esActualizacion ? 'PATCH' : 'POST';
    if (esActualizacion) {
        datosForm.id_persona = idEnMemoria;
    }

    try {
        const response = await fetch(URL_BASE, {
            method: httpMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosForm)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            await cargarDatosDesdeAPI(); 
            alert(esActualizacion ? 'Actualización completada.' : 'Registro agregado con éxito.');
            ocultarDialogo();
        } else {
            alert(`Error ${response.status}: ${data.message || 'Fallo al guardar el registro.'}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Sin conexión al servidor. Intente más tarde.');
    } finally {
        desactivarSpinner();
    }
}

async function iniciarBorrado(id) {
    if (!confirm(`¿Confirmar eliminación del registro ID ${id}?`)) {
        return;
    }

    activarSpinner();
    try {
        const response = await fetch(URL_BASE, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_persona: id })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            alert('Registro eliminado correctamente.');
            await cargarDatosDesdeAPI(); 
        } else {
            alert(`Error ${response.status}: ${data.message || 'No se pudo eliminar el registro.'}`);
        }
    } catch (error) {
        console.error('Error en la eliminación:', error);
        alert('Error de conexión al intentar eliminar.');
    } finally {
        desactivarSpinner();
    }
}

function dibujarFilasTabla() {
    cuerpoTabla.innerHTML = ''; 

    if (registroUsuarios.length === 0) {
        const filaVacia = cuerpoTabla.insertRow();
        const celdaVacia = filaVacia.insertCell();
        celdaVacia.textContent = 'No hay datos disponibles para mostrar.';
        celdaVacia.colSpan = 8; 
        celdaVacia.style.textAlign = 'center';
        return;
    }

    registroUsuarios.forEach(usuario => {
        const nuevaFila = cuerpoTabla.insertRow();

        nuevaFila.insertCell().textContent = usuario.id;
        nuevaFila.insertCell().textContent = usuario.nombre;
        nuevaFila.insertCell().textContent = usuario.apellido;
        nuevaFila.insertCell().textContent = usuario.sexo;
        nuevaFila.insertCell().textContent = usuario.fh_nac;
        nuevaFila.insertCell().textContent = usuario.rol;

        const celdaEditar = nuevaFila.insertCell();
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Modificar';
        btnEditar.onclick = () => prepararEdicion(usuario.id);
        celdaEditar.appendChild(btnEditar);

        const celdaBorrar = nuevaFila.insertCell();
        const btnBorrar = document.createElement('button');
        btnBorrar.textContent = 'Eliminar';
        btnBorrar.onclick = () => iniciarBorrado(usuario.id);
        celdaBorrar.appendChild(btnBorrar);
    });
}

function prepararEdicion(id) {
    const personaEncontrada = registroUsuarios.find(p => String(p.id) === String(id));
    if (!personaEncontrada) {
        alert('No se pudo encontrar el registro seleccionado.');
        return;
    }

    idEnMemoria = personaEncontrada.id;

    document.querySelector('#a1').value = personaEncontrada.nombre;
    document.querySelector('#a2').value = personaEncontrada.apellido;
    document.querySelector('#a3').value = personaEncontrada.fh_nac;

    const radio = document.querySelector(`input[name=sexo][value="${personaEncontrada.sexo.toLowerCase()}"]`);
    if (radio) radio.checked = true;

    document.querySelector('#a4').value = convertirRolAId(personaEncontrada.rol, personaEncontrada.id_rol);
    
    dialogoFormulario.classList.remove('oculto');
}

function mostrarDialogoNuevo() {
    idEnMemoria = null;
    formElemento.reset();
    dialogoFormulario.classList.remove('oculto');
}

function ocultarDialogo() {
    dialogoFormulario.classList.add('oculto');
}

function leerValoresFormulario() {
    const sexoRadio = document.querySelector('input[name=sexo]:checked');
    const datos = {
        nombre: document.querySelector('#a1').value.trim(),
        apellido: document.querySelector('#a2').value.trim(),
        sexo: sexoRadio ? sexoRadio.value : null,
        fh_nac: document.querySelector('#a3').value.trim(),
        id_rol: document.querySelector('#a4').value
    };
    return datos;
}

function activarSpinner() {
    if (indicadorCarga) indicadorCarga.classList.remove('oculto');
}

function desactivarSpinner() {
    if (indicadorCarga) indicadorCarga.classList.add('oculto');
}

function convertirRolAId(rolTexto, idRolOriginal) {
    const rol = String(rolTexto || '').toLowerCase();
    
    if (rol.includes('estudiante') || rol.includes('alumno')) return '1';
    if (rol.includes('profesor')) return '2';
    if (rol.includes('administrativo')) return '3';
    if (rol.includes('directivo')) return '4';
    
    return idRolOriginal || ''; 
}