import { getIdToken } from 'firebase/auth';
import axios from 'axios';
import { auth } from '../firebase';

// Componente para verificar el rol del usuario en el backend
export const verificarRolBackend = async () => {
    
  // Verifica si el usuario está autenticado
  try {
    // Si el usuario no está autenticado, retorna null
    const token = await getIdToken(auth.currentUser);
    const response = await axios.get('https://backend-verificador-519521736458.us-central1.run.app/verificar-rol', {  
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000,
    });
    // Verifica si la respuesta contiene el rol
    return response.data.rol;

  } 
  // Si hay un error al obtener el token o la respuesta, se maneja aquí
  catch (error) {
    console.warn('No se pudo verificar el rol en backend. Usando rol local.');
    return null;
  }
};