// PART 2: Replace the existing getTopicProgress(), markTopicComplete(), and openSubject() functions
// through the closing brace of openSubject(), stopping immediately before getVerifiedQuestions().
function injectTopicProgressStyles() {
  if (document.getElementById('topicProgressStyles')) return;
  const style = document.createElement('style');
  style.id = 'topicProgressStyles';
  style.textContent = `
    .topic-group{border:1px solid #e4e9f0;border-radius:12px;padding:12px 14px;margin:10px 0;background:#fff}
    .topic-group>summary{cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700;color:#142d50}
    .topic-group>summary small{font-size:12px;color:#667085;font-weight:500}
    .topic-group>ol{padding-left:24px;margin:12px 0 0}
    .topic-line{padding:9px 0;border-top:1px solid #f0f2f5}
    .topic-line>strong{display:block;color:#344054;font-size:14px}
    .topic-leaf-list{list-style:disc;padding-left:22px;margin:8px 0 0}
    .topic-leaf{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px dashed #edf0f4}
    .topic-leaf>span,.topic-terminal-line>span{flex:1;min-width:180px;font-size:13px;line-height:1.55}
    .topic-check{flex:none;background:#f8fafc;color:#475467;border:1px solid #d0d5dd;border-radius:8px;padding:6px 10px;font-size:12px;white-space:nowrap}
    .topic-check.completed{background:#ecfdf3;color:#027a48;border-color:#abefc6}
    .topic-exam-tags{display:block;color:#667085;font-size:11px;margin:8px 0 0}
    .topic-terminal-line{display:flex;align-items:center;justify-content:space-between;gap:12px}
    @media(max-width:600px){.topic-leaf{align-items:flex-start;flex-direction:column}.topic-check{margin-left:0}.topic-leaf>span,.topic-terminal-line>span{min-width:0}}
  `;
  document.head.appendChild(style);
}

function getTopicProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE.topics) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch (_) {
    return {};
  }
}

function getSubjectChecklist(subject) {
  const entries = [];
  (subject.topics || []).forEach((topic, groupIndex) => {
    const subs = Array.isArray(topic) ? (topic[1] || []) : (topic.subtopics || []);
    subs.forEach((sub, subIndex) => {
      const subTitle = typeof sub === 'string' ? sub : sub.title;
      const items = typeof sub === 'string' ? [] : (Array.isArray(sub.items) ? sub.items : []);
      const legacyKey = `${subject.id}:${groupIndex}:${subIndex}`;
      if (items.length) {
        items.forEach((item, itemIndex) => entries.push({
          key: `${subject.id}:${groupIndex}:${subIndex}:${itemIndex}`,
          legacyKey,
          title: item
        }));
      } else {
        entries.push({ key: legacyKey, legacyKey, title: subTitle });
      }
    });
  });
  return entries;
}

function getSubjectProgressStats(subject, progress = getTopicProgress()) {
  const entries = getSubjectChecklist(subject);
  const done = entries.filter((entry) => Boolean(progress[entry.key] ?? progress[entry.legacyKey])).length;
  return { done, total: entries.length, percent: entries.length ? Math.round(done / entries.length * 100) : 0 };
}

function updateOpenSubjectProgress(subject) {
  const stats = getSubjectProgressStats(subject);
  const count = $('subjectProgressCount');
  const percent = $('subjectProgressPercent');
  const bar = $('subjectProgressBar');
  if (count) count.textContent = `${bn(stats.done)} / ${bn(stats.total)}টি আইটেম সম্পন্ন`;
  if (percent) percent.textContent = `${bn(stats.percent)}%`;
  if (bar) bar.style.width = `${stats.percent}%`;
}

function markTopicComplete(key, checked) {
  const progress = getTopicProgress();
  progress[key] = Boolean(checked);
  try {
    localStorage.setItem(STORAGE.topics, JSON.stringify(progress));
  } catch (_) {
    toast('এই ডিভাইসে অগ্রগতি সংরক্ষণ করা যায়নি।');
    return;
  }
  const button = [...document.querySelectorAll('[data-topic-check]')].find((node) => node.dataset.topicCheck === key);
  if (button) {
    button.classList.toggle('completed', Boolean(checked));
    button.textContent = checked ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি';
    button.setAttribute('aria-pressed', String(Boolean(checked)));
  }
  const subject = subjects.find((item) => item.id === selectedSubjectId);
  if (subject) updateOpenSubjectProgress(subject);
  toast(checked ? 'টপিকটি সম্পন্ন হিসেবে চিহ্নিত হয়েছে।' : 'টপিকটি অসম্পন্ন করা হয়েছে।');
}

function openSubject(subjectId) {
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return;

  selectedSubjectId = subjectId;
  injectTopicProgressStyles();
  const progress = getTopicProgress();
  const examNames = { BCS: 'BCS', Bank: 'Bank', Govt: 'Government Job' };

  const topicHTML = subject.topics.map((topic, groupIndex) => {
    const topicTitle = Array.isArray(topic) ? topic[0] : topic.title;
    const subs = Array.isArray(topic) ? (topic[1] || []) : (topic.subtopics || []);
    const exams = Array.isArray(topic.exams) ? topic.exams : [];
    const examText = exams.length
      ? `<small class="topic-exam-tags">প্রযোজ্য: ${exams.map((name) => escapeHtml(examNames[name] || name)).join(' · ')}</small>`
      : '';

    const subHTML = subs.map((sub, subIndex) => {
      const subTitle = typeof sub === 'string' ? sub : sub.title;
      const items = typeof sub === 'string' ? [] : (Array.isArray(sub.items) ? sub.items : []);
      const legacyKey = `${subject.id}:${groupIndex}:${subIndex}`;

      // When an older version marked the whole subtopic complete, retain that state
      // for its leaf items unless a newer item-level value has explicitly been saved.
      if (!items.length) {
        const done = Boolean(progress[legacyKey]);
        return `<li class="topic-line topic-terminal-line">
          <span>${escapeHtml(subTitle)}</span>
          <button class="topic-check ${done ? 'completed' : ''}" type="button"
            data-topic-check="${escapeHtml(legacyKey)}" aria-pressed="${String(done)}">
            ${done ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি'}
          </button>
        </li>`;
      }

      const itemHTML = items.map((item, itemIndex) => {
        const key = `${subject.id}:${groupIndex}:${subIndex}:${itemIndex}`;
        const done = Boolean(progress[key] ?? progress[legacyKey]);
        return `<li class="topic-leaf">
          <span>${escapeHtml(item)}</span>
          <button class="topic-check ${done ? 'completed' : ''}" type="button"
            data-topic-check="${escapeHtml(key)}" aria-pressed="${String(done)}">
            ${done ? '✓ সম্পন্ন' : 'পড়া শেষ হয়নি'}
          </button>
        </li>`;
      }).join('');

      return `<li class="topic-line">
        <strong>${escapeHtml(subTitle)}</strong>
        <ul class="subtopic-details topic-leaf-list">${itemHTML}</ul>
      </li>`;
    }).join('');

    return `<details class="topic-group" open>
      <summary>
        <span>${escapeHtml(topicTitle)}</span>
        <small>${bn(subs.length)}টি সাবটপিক</small>
      </summary>
      ${examText}
      <ol>${subHTML}</ol>
    </details>`;
  }).join('');

  const stats = getSubjectProgressStats(subject, progress);
  $('subjectDetail').classList.remove('hidden');
  $('subjectDetail').innerHTML = `
    <div class="detail-head">
      <div>
        <span class="eyebrow">SUBJECT FOLDER</span>
        <h3>${escapeHtml(subject.title)}</h3>
        <p class="muted">${escapeHtml(subject.bn)} · ${escapeHtml(subject.description)}</p>
      </div>
      <button type="button" class="button button-light" id="closeSubject">বন্ধ করুন</button>
    </div>
    <div class="subject-progress-panel" style="margin:12px 0 18px;padding:12px;border:1px solid #e5eaf1;border-radius:12px;background:#f8fafc">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
        <strong id="subjectProgressCount">${bn(stats.done)} / ${bn(stats.total)}টি আইটেম সম্পন্ন</strong>
        <strong id="subjectProgressPercent">${bn(stats.percent)}%</strong>
      </div>
      <div style="height:8px;background:#e8edf3;border-radius:20px;overflow:hidden;margin-top:9px">
        <span id="subjectProgressBar" style="display:block;height:100%;width:${stats.percent}%;background:#16845b;transition:width .2s"></span>
      </div>
    </div>
    <p class="muted" style="font-size:12px">প্রতিটি সর্বশেষ টপিক শেষ হলে তার পাশের “পড়া শেষ হয়নি” বোতামে চাপ দিন। চিহ্ন এই ব্রাউজারে সংরক্ষিত হবে।</p>
    <div class="topic-groups">${topicHTML}</div>
  `;
  $('subjectDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });

  $('closeSubject').addEventListener('click', () => {
    $('subjectDetail').classList.add('hidden');
  });

  $('subjectDetail').querySelectorAll('[data-topic-check]').forEach((button) => {
    button.addEventListener('click', () => {
      markTopicComplete(button.dataset.topicCheck, !button.classList.contains('completed'));
    });
  });
}
