# ⚽ MegaMatch - Plataforma de Partidos de Fútbol

Aplicación web para descubrir, calificar y seguir partidos de fútbol. Inspirada en Letterboxd pero para partidos de fútbol.

## 🚀 Stack Tecnológico

### Frontend
- **React 18** con **Vite**
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **JWT** en localStorage para autenticación
- **CSS puro** con temática oscura tipo Letterboxd

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Navbar.jsx      # Barra de navegación
│   ├── MatchCard.jsx   # Tarjeta de partido
│   └── ProtectedRoute.jsx  # Componente para rutas protegidas
├── pages/              # Páginas principales
│   ├── Login.jsx       # Página de inicio de sesión
│   ├── Register.jsx    # Página de registro
│   ├── Home.jsx        # Página principal con listado de partidos
│   └── Profile.jsx     # Perfil del usuario
├── services/           # Servicios y API
│   ├── authService.js  # Servicio de autenticación
│   └── api.js          # Configuración de Axios con interceptores
├── styles/             # Estilos adicionales
├── App.tsx             # Componente principal con rutas
├── main.tsx            # Punto de entrada
└── index.css           # Estilos globales
```

## 🎨 Características

### Autenticación
- ✅ Registro de usuarios
- ✅ Login con JWT
- ✅ Protección de rutas por autenticación
- ✅ Protección de rutas por rol (admin/user)
- ✅ Interceptor Axios para agregar token automáticamente

### Funcionalidades de Partidos
- ✅ Visualizar listado de partidos
- ✅ Marcar partidos como vistos
- ✅ Calificar partidos (1-5 estrellas)
- ✅ Filtrar por: Todos / Vistos / Por ver
- ✅ Ver rating promedio de cada partido

### Perfil de Usuario
- ✅ Ver estadísticas personales
- ✅ Ver partidos vistos
- ✅ Ver promedio de calificaciones
- ✅ Competición favorita

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd mega-match-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` y configurar la URL del backend:
```env
VITE_API_URL=http://localhost:8080/api
```

4. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📦 Scripts Disponibles

```bash
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar para producción
npm run preview      # Previsualizar build de producción
npm run lint         # Ejecutar ESLint
```

## 🎯 Rutas de la Aplicación

### Rutas Públicas
- `/login` - Inicio de sesión
- `/register` - Registro de nuevo usuario

### Rutas Protegidas (requieren autenticación)
- `/` - Home con listado de partidos
- `/profile` - Perfil del usuario

### Rutas Admin (requieren rol admin)
- `/admin` - Panel de administración (por implementar)

## 🔐 Autenticación

El sistema de autenticación funciona con:

1. **JWT almacenado en localStorage**
   - Token guardado después del login/registro
   - Token enviado automáticamente en todas las peticiones
   - Token removido al hacer logout

2. **Interceptor de Axios**
   - Agrega automáticamente el header `Authorization: Bearer <token>`
   - Maneja errores 401 (no autenticado) redirigiendo al login

3. **Protección de Rutas**
   - Componente `ProtectedRoute` que verifica autenticación
   - Redirección automática a `/login` si no está autenticado
   - Soporte para verificación de roles (admin/user)

## 🎨 Tema Visual

Inspirado en **Letterboxd**:
- 🌑 Fondo oscuro (#14181c)
- 💎 Acento cyan (#00e5ff)
- 📝 Tipografía limpia y legible
- ✨ Transiciones suaves
- 🎯 Cards con hover effects

## 🔄 Conexión con Backend

La aplicación espera un backend con los siguientes endpoints:

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Partidos
- `GET /api/matches` - Obtener todos los partidos
- `GET /api/matches/:id` - Obtener un partido
- `POST /api/matches` - Crear partido (admin)
- `PUT /api/matches/:id` - Actualizar partido (admin)
- `DELETE /api/matches/:id` - Eliminar partido (admin)
- `POST /api/matches/:id/watched` - Marcar como visto
- `DELETE /api/matches/:id/watched` - Desmarcar como visto
- `POST /api/matches/:id/rate` - Calificar partido

### Usuario
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/stats` - Obtener estadísticas
- `GET /api/users/watched-matches` - Obtener partidos vistos

## 📝 Próximas Mejoras

- [ ] Panel de administración para CRUD de partidos
- [ ] Sistema de comentarios en partidos
- [ ] Búsqueda y filtros avanzados
- [ ] Modo claro/oscuro
- [ ] Notificaciones
- [ ] Compartir partidos en redes sociales
- [ ] Listas personalizadas de partidos
- [ ] Estadísticas avanzadas

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👥 Autor

Desarrollado con ❤️ para los amantes del fútbol
