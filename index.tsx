document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.querySelector('.nav-toggle') as HTMLButtonElement;
    const nav = document.querySelector('.nav') as HTMLElement;
    const dropdowns = document.querySelectorAll('.nav__item.dropdown');

    // Mobile navigation toggle
    navToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Handle dropdowns on mobile
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav__link');
        link?.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                // Prevent link navigation to allow dropdown to open
                e.preventDefault();
                dropdown.classList.toggle('open');
                const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement;
                if(menu) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }
            }
        });
    });
    
    // Appointment form submission
    const form = document.querySelector('.appointment__form') as HTMLFormElement;
    const formMessage = document.getElementById('form-message') as HTMLParagraphElement;

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // In a real application, you would send this data to a server.
            // For this demo, we'll just show a success message.
            form.style.display = 'none';

            if(formMessage) {
              formMessage.textContent = 'Thank you for your inquiry! We will get back to you shortly.';
              formMessage.style.color = 'var(--primary-color)';
            }
        });
    }
});
