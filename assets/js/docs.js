// Docs: highlight the section in view
import { $$, boot } from './core.js?v=1';
boot();
const links = $$('#dAside a'), io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
$$('.doc section').forEach(s => io.observe(s));
