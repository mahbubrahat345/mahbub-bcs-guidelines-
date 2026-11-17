/* Mahbub BCS Guidelines — Exercise folders and accordion explanations */
(function () {
  'use strict';
  const bn = (n) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const folders = [
    { id: 'BCS', title: 'BCS Exercise', bn: 'বিসিএস অনুশীলন', icon: '📘', target: '২৫–৩০ সেট', note: 'প্রতি সেটে ২০০টি MCQ; ৫০তম BCS প্রিলিমিনারির বিষয়ভিত্তিক কাঠামো অনুযায়ী।' },
    { id: 'Bank', title: 'Bank Exercise', bn: 'ব্যাংক অনুশীলন', icon: '🏦', target: '১০–১৫ সেট', note: 'বাংলা, English, গণিত, বিশ্লেষণী দক্ষতা, সাধারণ জ্ঞান, ICT ও ব্যাংকিং।' },
    { id: 'Govt', title: 'Government Job Exercise', bn: 'সরকারি চাকরি অনুশীলন', icon: '🏛️', target: '১০–১৫ সেট', note: 'সাধারণ নিয়োগ পরীক্ষার উপযোগী বিষয়ভিত্তিক অনুশীলনী। পদভেদে কাঠামো আলাদা হতে পারে।' }
  ];
  let view, currentFolder = null, currentSet = null;

  const style = document.createElement('style');
  style.textContent = `
    #exerciseView .exercise-folder-grid,#exerciseView .exercise-set-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:14px 0}
    #exerciseView .exercise-folder,#exerciseView .exercise-set{border:1px solid var(--line,#dce3ed);border-radius:16px;padding:16px;background:var(--card,#fff);text-align:left;color:inherit;width:100%;cursor:pointer}
    #exerciseView .exercise-folder strong,#exerciseView .exercise-set strong{display:block;font-size:1.04rem;margin:5px 0}
    #exerciseView .exercise-folder small,#exerciseView .exercise-set small{color:var(--muted,#667085)}
    #exerciseView .exercise-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}
    #exerciseView .exercise-subject{margin:20px 0 10px;padding:10px 12px;border-radius:10px;background:var(--soft,#f3f6fb);font-weight:700}
    #exerciseView .exercise-question{border:1px solid var(--line,#dce3ed);border-radius:14px;padding:14px;margin:10px 0;background:var(--card,#fff)}
    #exerciseView .exercise-question h4{margin:0 0 10px;line-height:1.55}
    #exerciseView .exercise-options{margin:0;padding-left:25px;line-height:1.8}
    #exerciseView .exercise-explain{margin-top:12px;border-top:1px solid var(--line,#dce3ed);padding-top:10px}
    #exerciseView .exercise-explain summary{cursor:pointer;font-weight:700;color:var(--primary,#174a83);padding:5px 0}
    #exerciseView .exercise-answer{margin-top:8px;padding:10px;border-radius:10px;background:var(--soft,#f3f6fb)}
    #exerciseView .exercise-muted{color:var(--muted,#667085);font-size:.9rem}
    #exerciseView .exercise-progress{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
    #exerciseView .exercise-subject-count{font-size:.85rem;color:var(--muted,#667085);font-weight:400}
    @media(max-width:520px){#exerciseView .exercise-folder-grid,#exerciseView .exercise-set-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function addNavigationAndView() {
    const app = document.getElementById('appView');
    const nav = app?.querySelector('.main-nav');
    if (!app || !nav || document.getElementById('exerciseView')) return false;
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'exerciseNav'; button.className = 'nav-item';
    button.textContent = 'Exercise';
    nav.appendChild(button);
    view = document.createElement('section');
    view.id = 'exerciseView'; view.className = 'content-view hidden';
    app.appendChild(view);
    button.addEventListener('click', showExercise);
    return true;
  }
  function showExercise() {
    document.querySelectorAll('#appView .content-view').forEach(el => el.classList.toggle('hidden', el.id !== 'exerciseView'));
    document.querySelectorAll('.main-nav .nav-item').forEach(el => el.classList.toggle('active', el.id === 'exerciseNav'));
    document.getElementById('topicView')?.classList.add('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
    renderFolders();
  }
  function renderFolders() {
    currentFolder = null; currentSet = null;
    const bank = window.EXERCISE_BANK || {};
    view.innerHTML = `<div class="section-heading"><div><span class="eyebrow">PRACTICE QUESTION LIBRARY</span><h2>Exercise</h2><p class="muted">সব প্রশ্ন নতুনভাবে তৈরি নমুনা অনুশীলনী; বিগত বছরের আসল প্রশ্ন নয়।</p></div></div>
      <div class="exercise-folder-grid">${folders.map(f => {
        const sets = Array.isArray(bank[f.id]) ? bank[f.id] : [];
        return `<button type="button" class="exercise-folder" data-ex-folder="${f.id}"><span>${f.icon}</span><strong>${esc(f.bn)}</strong><small>${esc(f.target)} · বর্তমানে ${bn(sets.length)}টি সেট প্রস্তুত</small><p class="exercise-muted">${esc(f.note)}</p></button>`;
      }).join('')}</div>`;
    view.querySelectorAll('[data-ex-folder]').forEach(btn => btn.addEventListener('click', () => openFolder(btn.dataset.exFolder)));
  }
  function openFolder(folderId) {
    currentFolder = folders.find(f => f.id === folderId);
    const sets = (window.EXERCISE_BANK || {})[folderId] || [];
    view.innerHTML = `<div class="exercise-toolbar"><button type="button" class="button button-light" data-ex-back>← Exercise</button><span class="eyebrow">${esc(currentFolder.title)}</span></div>
      <div class="section-heading"><div><h2>${esc(currentFolder.bn)}</h2><p class="muted">${esc(currentFolder.note)}</p></div></div>
      ${sets.length ? `<div class="exercise-set-grid">${sets.map((s,i)=>`<button type="button" class="exercise-set" data-ex-set="${i}"><strong>${esc(s.label || `Set ${String(i+1).padStart(2,'0')}`)}</strong><small>${bn(s.totalQuestions || s.questions?.length || 0)}টি প্রশ্ন · ${bn(s.durationMinutes || 0)} মিনিট</small><p class="exercise-muted">${esc(s.examModel || 'নমুনা অনুশীলনী সেট')}</p></button>`).join('')}</div>` : `<div class="panel"><b>এই বিভাগের প্রথম সেট এখনো যোগ করা হয়নি।</b><p class="exercise-muted">এই প্যাকেটে BCS Exercise-এর ১ নম্বর সেট দেওয়া হয়েছে। ব্যাংক ও সরকারি চাকরির সেট আলাদা বিষয়বিন্যাসে প্রস্তুত হলে একই ফোল্ডারে যুক্ত হবে।</p></div>`}`;
    view.querySelector('[data-ex-back]').addEventListener('click', renderFolders);
    view.querySelectorAll('[data-ex-set]').forEach(btn => btn.addEventListener('click', () => openSet(folderId, Number(btn.dataset.exSet))));
  }
  function openSet(folderId, setIndex) {
    const set = ((window.EXERCISE_BANK || {})[folderId] || [])[setIndex];
    if (!set) return;
    currentSet = set;
    const groups = new Map();
    set.questions.forEach((q, i) => {
      if (!groups.has(q.subject)) groups.set(q.subject, []);
      groups.get(q.subject).push({...q, number:i+1});
    });
    let html = `<div class="exercise-toolbar"><button type="button" class="button button-light" data-ex-back>← সেটসমূহ</button><span class="eyebrow">${esc(set.label)}</span></div>
      <div class="section-heading"><div><h2>${esc(set.label)}</h2><p class="muted">${esc(set.examModel)}</p><p class="exercise-muted">${esc(set.disclaimer || '')}</p></div></div>
      <div class="exercise-progress"><b>মোট ${bn(set.questions.length)}টি প্রশ্ন</b><span class="exercise-muted">সময়: ${bn(set.durationMinutes)} মিনিট</span></div>`;
    groups.forEach((items, subject) => {
      html += `<h3 class="exercise-subject">${esc(subject)} <span class="exercise-subject-count">— ${bn(items.length)}টি</span></h3>`;
      items.forEach(q => {
        html += `<article class="exercise-question"><h4>${bn(q.number)}. ${esc(q.question)}</h4><ol class="exercise-options" type="a">${q.options.map(option=>`<li>${esc(option)}</li>`).join('')}</ol>
          <details class="exercise-explain"><summary>উত্তর ও সংক্ষিপ্ত ব্যাখ্যা দেখুন</summary><div class="exercise-answer"><p><b>সঠিক উত্তর:</b> ${esc(q.options[q.correctIndex])}</p><p><b>ব্যাখ্যা:</b> ${esc(q.explanation)}</p></div></details></article>`;
      });
    });
    view.innerHTML = html;
    view.querySelector('[data-ex-back]').addEventListener('click', () => openFolder(folderId));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function init() { if (addNavigationAndView()) return; document.addEventListener('DOMContentLoaded', addNavigationAndView, {once:true}); }
  init();
})();
