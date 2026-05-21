// Central Tailwind config — edit colors here, changes apply to every page.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      colors: {
        charcoal: '#1C242F',   // primary background
        navy:     '#0B1320',   // deep sections (hero, values overlay)
        darkgrey: '#242E3C',   // alternating secondary sections
        accent:   '#436850',   // forest green
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  }
}
