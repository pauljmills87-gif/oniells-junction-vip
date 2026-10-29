// Stage 1: same real, clickable venue buttons. Two branded login screens.
// Stage 2: Supabase authentication. No real PINs are checked in this preview.
const venues = {
  oneills: { title: "O'Neills", location: 'Vilamoura Marina', logo: 'assets/oneills-logo.png', example:'ON-0001' },
  junction: { title: 'The Junction Roadhouse', location: 'Almancil', logo: 'assets/junction-logo.png', example:'JR-0001' },
};
const home=document.getElementById('home-screen');
const login=document.getElementById('login-screen');
const logo=document.getElementById('venue-logo');
const numberInput=document.getElementById('member-number');
const pinInput=document.getElementById('pin');
const status=document.getElementById('status-message');
const toggle=document.getElementById('pin-toggle');
function showRoute(){
  const id=window.location.hash.startsWith('#/login/')?window.location.hash.slice(8):'';
  const venue=venues[id];
  if(!venue){home.classList.remove('is-hidden');login.classList.add('is-hidden');document.title="VIP Loyalty App | Choose your venue";return;}
  logo.src=venue.logo;
  logo.alt=venue.title+' '+venue.location+' logo';
  login.classList.toggle('junction-theme',id==='junction');
  document.title=venue.title+' | VIP Member Login';
  numberInput.placeholder='e.g. '+venue.example;
  numberInput.value=''; pinInput.value=''; pinInput.type='password'; toggle.textContent='Show'; toggle.setAttribute('aria-pressed','false');
  status.textContent='Design preview only. Secure login will be connected to Supabase next.';
  home.classList.add('is-hidden');login.classList.remove('is-hidden');window.scrollTo(0,0);
}
document.querySelectorAll('[data-venue]').forEach(b=>b.addEventListener('click',()=>{window.location.hash='#/login/'+b.dataset.venue;}));
document.getElementById('back-button').addEventListener('click',()=>{window.location.hash='#/';});
toggle.addEventListener('click',()=>{const show=pinInput.type==='password';pinInput.type=show?'text':'password';toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-pressed',String(show));});
numberInput.addEventListener('input',()=>{numberInput.value=numberInput.value.toUpperCase().replace(/[^A-Z0-9-]/g,'');});
pinInput.addEventListener('input',()=>{pinInput.value=pinInput.value.replace(/\D/g,'').slice(0,4);});
document.getElementById('login-form').addEventListener('submit',e=>{
  e.preventDefault();
  const isOneills=window.location.hash.endsWith('oneills');
  const prefix=isOneills?'ON-':'JR-';
  if(!numberInput.value.trim().toUpperCase().startsWith(prefix)){status.textContent='Please enter a membership number starting with '+prefix;return;}
  if(!/^\d{4}$/.test(pinInput.value)){status.textContent='Please enter exactly four digits for your PIN.';return;}
  status.textContent='This is a visual demonstration. Member verification will be enabled when we connect Supabase.';
});
document.getElementById('forgot-pin').addEventListener('click',()=>{status.textContent='For a PIN reset, please ask a member of staff at the bar.';});
window.addEventListener('hashchange',showRoute);
showRoute();
