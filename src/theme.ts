import { createTheme } from '@mui/material/styles'
import { blue, grey } from '@mui/material/colors'

declare module '@mui/material/styles' {
  interface PaletteOptions {
    primary: {
      lighter?: string
      light: string
      main: string
      dark: string
      contrastText: string
    }
  }
  interface Palette {
    primary: {
      lighter: string
      light: string
      main: string
      dark: string
      contrastText: string
    }
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      lighter: blue[50],
      light: blue[300],
      main: blue[500],
      dark: blue[700],
      contrastText: '#fff',
    },
    secondary: {
      light: '#f5f5f5',
      main: grey[700],
      dark: grey[900],
      contrastText: '#fff',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f5f7fa',
          height: '100vh',
        },
      },
    },
  },
})