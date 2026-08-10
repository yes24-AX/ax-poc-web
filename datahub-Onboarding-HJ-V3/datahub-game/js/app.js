import{SceneManager}from'./SceneManager.js';import{InteractionController}from'./InteractionController.js';
history.scrollRestoration='manual';
gsap.registerPlugin(ScrollTrigger);const manager=new SceneManager();new InteractionController(manager);
ScrollTrigger.create({trigger:'#experience',start:'top top',end:'bottom bottom',onUpdate:self=>{const index=Math.min(6,Math.floor(self.progress*7));manager.request(index);gsap.to('.room',{rotation:index%2?.12:-.12,scale:1+self.getVelocity()/200000,duration:.5,overwrite:true});}});
window.addEventListener('load',()=>{gsap.from('.room',{opacity:0,duration:1});manager.show(0)});
