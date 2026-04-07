document.addEventListener('DOMContentLoaded', () => {
    
    // Registrar ScrollTrigger do GSAP
    gsap.registerPlugin(ScrollTrigger);

    // ==========================================
    // 1. Animações de Entrada (Manteiga/Premium)
    // ==========================================
    
    const tlHero = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Animação da Navbar cair suavemente
    tlHero.to(".navbar", { opacity: 1, y: 0, duration: 1, delay: 0.2 });
    
    // Animação cascata (stagger) dos elementos do Hero
    tlHero.fromTo(".gs-reveal-hero", 
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.2 }, 
        "-=0.6" // Começa um pouco antes da navbar terminar
    );

    // Animação Revelar Seções ao Scroll
    const sections = gsap.utils.toArray('.section-reveal');
    sections.forEach(section => {
        gsap.to(section, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: section,
                start: "top 85%", // Começa quando o topo da seção chega a 85% da tela
                toggleActions: "play none none none" // Joga uma vez e não reseta
            }
        });
    });

    // Animação específica para os itens dentro das seções (cascata)
    const revealContainers = gsap.utils.toArray('.row, .stats-grid, #testimonialCarousel');
    revealContainers.forEach(container => {
        const items = container.querySelectorAll('.gs-reveal-item, .col-gs-reveal-left, .col-gs-reveal-right');
        if (items.length > 0) {
            gsap.fromTo(items, 
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8, stagger: 0.15, ease: "power2.out",
                    scrollTrigger: {
                        trigger: container,
                        start: "top 80%",
                    }
                }
            );
        }
    });


    // ==========================================
    // 2. Efeito de Digitação Fluido e Lindo
    // ==========================================
    const textElement = document.getElementById('typing-text');
    const phrases = [
        "sites que vendem",
        "sistemas inteligentes",
        "soluções digitais"
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            textElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            textElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }

        // Define velocidades diferentes para digitar, apagar e pausas
        let typeSpeed = isDeleting ? 40 : 80; // Apagar é mais rápido

        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typeSpeed = 2500; // Pausa longa no final da frase completa
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 300; // Pausa curta antes de começar a próxima
        }

        setTimeout(type, typeSpeed);
    }
    // Inicia após a animação do hero acabar
    setTimeout(type, 2000);


    // ==========================================
    // 3. Contadores Animados (Trigger GSAP)
    // ==========================================
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        
        ScrollTrigger.create({
            trigger: counter,
            start: "top 90%",
            onEnter: () => {
                gsap.to(counter, {
                    innerText: target,
                    duration: 2,
                    snap: { innerText: 1 }, // Garante números inteiros
                    ease: "power1.inOut"
                });
            }
        });
    });

// ==========================================
// 4. Efeito Magnético Refinado (Correção de Tremor)
// ==========================================
if(window.innerWidth > 991) { 
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', function(e) {
            const pos = this.getBoundingClientRect();
            // Calcula o centro do botão
            const centerX = pos.left + pos.width / 2;
            const centerY = pos.top + pos.height / 2;
            
            // Distância do mouse para o centro
            const moveX = (e.clientX - centerX) * 0.4;
            const moveY = (e.clientY - centerY) * 0.4;
            
            gsap.to(this, {
                x: moveX,
                y: moveY,
                duration: 0.4,
                ease: "power2.out"
            });
        });
        
        btn.addEventListener('mouseleave', function() {
            // Volta para a posição 0 com efeito elástico suave
            gsap.to(this, {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
}


    // ==========================================
    // 5. Scroll Suave e Navbar Comportamento
    // ==========================================
    
    // Fechar menu mobile ao clicar num link
    const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    const menuToggle = document.getElementById('navbarNav');
    const bsCollapse = new bootstrap.Collapse(menuToggle, {toggle:false});
    navLinks.forEach((l) => {
        l.addEventListener('click', () => { if(menuToggle.classList.contains('show')){bsCollapse.toggle();} });
    });

    // Offset para Scroll Suave (compensar navbar fixa)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            const target = document.querySelector(targetId);
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Diminuir Navbar ao Rolar
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            nav.style.padding = "0.7rem 0";
            nav.classList.add('shadow');
        } else {
            nav.style.padding = "1.2rem 0";
            nav.classList.remove('shadow');
        }
    });
});