
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          
          "700": "#A43D94", //buttons
          "800": "#10121B", //background color
          "900": "#831843",
          "950": "#500724"
        }
      },
      fontFamily: {
        'body': [
          'Roboto', 'sans-serif'
          
          
        ],
    
        'header': [
          'Lastica', 'sans-serif'
        ],
       
        'second-header': [
          "Archivo Black", 'sans-serif'
        ]

      }
    }
  }
};