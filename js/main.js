/* ============================================================
   江苏信访 · 群众网上预约信访平台（设计原型 v2）
   公共脚本：无障碍、导航、FAQ、工具函数、预约与公告数据存储
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 顶部日期 ---------- */
  var todayEl = document.getElementById('today');
  if (todayEl) {
    var d = new Date();
    var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    todayEl.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + week;
  }

  /* ---------- 无障碍：字号 / 高对比度 ---------- */
  var fsBtns = document.querySelectorAll('.fc-btn[data-fs]');
  var savedFs = parseInt(localStorage.getItem('xf_fs') || '0', 10);
  var applyFs = function (n) {
    document.body.classList.remove('size-1', 'size-2');
    if (n > 0) document.body.classList.add('size-' + n);
    fsBtns.forEach(function (b) {
      b.classList.toggle('on', parseInt(b.getAttribute('data-fs'), 10) === n);
    });
  };
  fsBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var n = parseInt(b.getAttribute('data-fs'), 10);
      localStorage.setItem('xf_fs', String(n));
      applyFs(n);
    });
  });
  applyFs(savedFs);

  var contrastBtn = document.getElementById('btn-contrast');
  if (contrastBtn) {
    var savedC = localStorage.getItem('xf_contrast') === '1';
    var applyContrast = function (on) {
      document.body.classList.toggle('contrast', on);
      contrastBtn.textContent = on ? '关闭高对比度' : '高对比度';
    };
    contrastBtn.addEventListener('click', function () {
      var on = !document.body.classList.contains('contrast');
      localStorage.setItem('xf_contrast', on ? '1' : '0');
      applyContrast(on);
    });
    applyContrast(savedC);
  }

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- FAQ 手风琴 ---------- */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item');
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 指南页侧栏滚动定位 ---------- */
  var guideNav = document.querySelector('.guide-nav');
  if (guideNav) {
    var links = guideNav.querySelectorAll('a');
    var sections = Array.prototype.map.call(links, function (a) {
      return document.querySelector(a.getAttribute('href'));
    });
    var onScroll = function () {
      var pos = window.scrollY + 120;
      var cur = links[0];
      sections.forEach(function (s, i) {
        if (s && s.offsetTop <= pos) cur = links[i];
      });
      links.forEach(function (a) { a.classList.toggle('on', a === cur); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Toast ---------- */
  var toastEl = null, toastTimer = null;
  window.showToast = function (msg, isErr) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', !!isErr);
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  };

  /* ---------- 通用工具 ---------- */
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  var fmtDate = function (dt) {
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  };
  var fmtDateTime = function (dt) {
    return fmtDate(dt) + ' ' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
  };
  window.XF = window.XF || {};
  window.XF.pad2 = pad2;
  window.XF.fmtDate = fmtDate;
  window.XF.fmtDateTime = fmtDateTime;

  /* 未来 n 个工作日（不含今天，节假日未做排除，演示用） */
  window.XF.nextWorkdays = function (n) {
    var out = [], d = new Date();
    while (out.length < n) {
      d.setDate(d.getDate() + 1);
      var day = d.getDay();
      if (day !== 0 && day !== 6) out.push(new Date(d));
    }
    return out;
  };

  /* ---------- 校验 ---------- */
  window.XF.validIdCard = function (id) {
    if (typeof id !== 'string') return false;
    id = id.trim().toUpperCase();
    if (!/^\d{17}[\dX]$/.test(id)) return false;
    var y = +id.slice(6, 10), m = +id.slice(10, 12), dd = +id.slice(12, 14);
    if (y < 1920 || y > new Date().getFullYear()) return false;
    if (m < 1 || m > 12) return false;
    if (dd < 1 || dd > 31) return false;
    var birth = new Date(y, m - 1, dd);
    if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== dd) return false;
    if (birth > new Date()) return false;
    var w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    var map = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    var sum = 0;
    for (var i = 0; i < 17; i++) sum += +id[i] * w[i];
    return map[sum % 11] === id[17];
  };
  window.XF.validMobile = function (p) {
    return /^1[3-9]\d{9}$/.test((p || '').trim());
  };
  window.XF.maskName = function (n) {
    if (!n) return '';
    return n.length <= 1 ? n : n[0] + '*'.repeat(n.length - 1);
  };
  window.XF.maskPhone = function (p) {
    p = String(p || '');
    return p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p;
  };

  /* ---------- 预约数据存储（v2：无接访单位、待审核流转） ---------- */
  var KEY = 'xf_appointments_v2';
  window.XF.storage = {
    list: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch (e) { return []; }
    },
    save: function (rec) {
      var arr = window.XF.storage.list();
      arr.unshift(rec);
      localStorage.setItem(KEY, JSON.stringify(arr));
    },
    update: function (rec) {
      var arr = window.XF.storage.list().map(function (r) {
        return r.id === rec.id ? rec : r;
      });
      localStorage.setItem(KEY, JSON.stringify(arr));
    },
    remove: function (id) {
      var arr = window.XF.storage.list().filter(function (r) { return r.id !== id; });
      localStorage.setItem(KEY, JSON.stringify(arr));
    },
    find: function (id) {
      return window.XF.storage.list().find(function (r) {
        return r.id.toUpperCase() === String(id).trim().toUpperCase();
      });
    }
  };

  /* ---------- 演示数据（首次访问写入，便于体验查询与后台管理） ---------- */
  window.XF.storage.seed = function () {
    if (localStorage.getItem('xf_seeded_v2')) return;
    var demo = [
      {
        id: 'YY202607150001', name: '王建国', idCard: '320102196507150033',
        phone: '13805170001', region: '南京市', cat: '申诉求决类', type: '道路交通类',
        date: '2026-07-16', slot: '08:30-09:10',
        summary: '反映2026年6月12日交通事故责任认定异议问题，请求复核。',
        materials: '有', status: '已办结', createdAt: '2026-07-15 09:12',
        timeline: [
          { label: '预约提交成功', time: '2026-07-15 09:12' },
          { label: '审核通过，短信通知', time: '2026-07-15 16:40' },
          { label: '现场接访完成', time: '2026-07-16 08:40' },
          { label: '办理答复：作出复核意见', time: '2026-07-30 15:05' },
          { label: '事项办结', time: '2026-07-30 15:06' }
        ]
      },
      {
        id: 'YY202608100002', name: '李秀兰', idCard: '320105195804220063',
        phone: '13951880002', region: '苏州市', cat: '申诉求决类', type: '治安管理类',
        date: '2026-08-20', slot: '10:10-10:50',
        summary: '反映小区广场舞噪音扰民问题，前期报警后处理结果不理想，请求再次协调。',
        materials: '有', status: '待审核', createdAt: '2026-08-10 10:02',
        timeline: [
          { label: '预约提交成功', time: '2026-08-10 10:02' }
        ]
      },
      {
        id: 'YY202608150003', name: '陈志明', idCard: '320583198803120030',
        phone: '13701530003', region: '无锡市', cat: '意见建议类', type: '交通管理建议',
        date: '2026-08-21', slot: '09:20-10:00',
        summary: '建议在部分学校周边路段高峰时段增设临时停车位，并优化红绿灯配时。',
        materials: '无', status: '待接访', createdAt: '2026-08-15 14:30',
        timeline: [
          { label: '预约提交成功', time: '2026-08-15 14:30' },
          { label: '审核通过，短信通知', time: '2026-08-16 09:10' }
        ]
      }
    ];
    localStorage.setItem(KEY, JSON.stringify(demo));
    localStorage.setItem('xf_seeded_v2', '1');
  };
  window.XF.storage.seed();

  /* ---------- 公告数据存储 ---------- */
  var ANN_KEY = 'xf_announcements_v1';
  var ANN_SEED = [
    {
      id: 'news-time', title: '关于调整人民来访接待大厅接待时间的公告', date: '2026-08-10', tag: '重要',
      summary: '自2026年8月17日起，接待时间调整为：周一、二、四 8:30-11:30 / 14:00-17:00；周三、五 8:30-11:30（秋冬季下午 13:30-16:30）……',
      body: '<p>为方便群众来访，合理利用接待资源，现将接待时间调整如下：</p><h3>一、接待时间</h3><p><b>周一、周二、周四：</b>上午 8:30-11:30，下午 14:00-17:00（秋冬季 13:30-16:30）；</p><p><b>周三、周五：</b>上午 8:30-11:30（下午不安排接待）。</p><p>法定节假日不安排接待，午休时段及非工作时间不安排接待。</p><h3>二、温馨提示</h3><ul><li>到访前请通过本平台预约，减少现场等待；</li><li>请携带本人身份证原件及信访材料；</li><li>老年人、残疾人等特殊困难群众可通过绿色通道优先安排。</li></ul><p>请广大群众相互转告。</p>'
    },
    {
      id: 'news-source', title: '全省公安机关深入开展信访问题源头治理专项行动', date: '2026-08-05', tag: '动态',
      summary: '坚持和发展新时代"枫桥经验"，推动矛盾纠纷就地化解、依法化解……',
      body: '<p>全省公安机关坚持和发展新时代"枫桥经验"，深化信访问题源头治理专项行动，聚焦群众反映集中的突出问题，推动矛盾纠纷就地化解、依法化解。</p><p>各地将畅通群众诉求表达渠道，落实首办责任制，提升初次信访办理质效，努力实现"小事不出村、大事不出镇、矛盾不上交"。</p>'
    },
    {
      id: 'news-standard', title: '关于规范网上预约信访有关事项的通告', date: '2026-07-28', tag: '通告',
      summary: '实名预约、一事项一约、每名群众每月预约不超过2次，预约不收取任何费用……',
      body: '<p>为规范群众预约信访工作，提高接待效率，维护正常信访秩序，现将有关事项通告如下：</p><h3>一、实行实名预约</h3><p>群众通过本平台预约信访，应当如实填写真实姓名、身份证号码、手机号码等信息。预约到场时须出示本人身份证原件进行核验，预约资格不得转让、倒卖。冒用他人身份预约的，取消预约资格，并依法依规处理。</p><h3>二、规范预约规则</h3><ul><li>同一信访事项原则上只预约一次，一事项一约；</li><li>每名群众每月预约不超过2次，请合理安排来访计划；</li><li>预约开放未来5个工作日时段，约满即止；</li><li>如无法按时到场，请提前24小时在"预约查询"页面在线取消。</li></ul><h3>三、免费接待服务</h3><p>信访预约、接待、办理全程不收取任何费用。任何以"代办预约""加急办理""疏通关系"为名收取费用的行为均涉嫌诈骗，请广大群众提高警惕，发现相关线索请及时向公安机关举报。</p><h3>四、遵守信访秩序</h3><p>来访群众应当遵守法律法规和信访秩序，如实反映情况，文明理性表达诉求。多人反映共同事项的，请推选不超过5名代表来访。</p><h3>五、本通告自发布之日起施行</h3><p>请广大群众相互转告，感谢您对信访工作的理解和支持。</p>'
    },
    {
      id: 'news-weekend', title: '关于增设周末预约专场的通知', date: '2026-07-15', tag: '通知',
      summary: '为方便上班族群众来访，8月起每月第二周周六增设预约专场……',
      body: '<p>为方便上班族群众来访，8月起每月第二周周六上午增设预约专场，具体时段以预约页面开放为准。</p><p>周末专场名额有限，请确有需要的群众提前预约，预约成功后按约定时间到场。</p>'
    },
    {
      id: 'news-anti-fraud', title: '关于防范以"信访代办"名义实施诈骗的提醒', date: '2026-07-08', tag: '提醒',
      summary: '信访不收费、代办是骗局。请广大群众切勿向任何个人或机构支付"打点费"……',
      body: '<p>近期发现个别不法分子打着"信访代办""内部关系""包办解决"的旗号向群众收取费用。特此提醒：</p><ul><li>信访预约、接待、办理全程不收取任何费用；</li><li>任何声称"花钱能办事""有关系能销号"的都是诈骗；</li><li>请通过本平台、12345政务服务热线等正规渠道反映问题；</li><li>如遇可疑情况，请及时报警。</li></ul>'
    },
    {
      id: 'news-launch', title: '关于"群众网上预约信访平台"上线试运行的公告', date: '2026-07-01', tag: '动态',
      summary: '平台试运行期间欢迎广大群众使用并提出宝贵意见……',
      body: '<p>为优化群众来访接待服务，减少现场排队等待，"群众网上预约信访平台"上线试运行。</p><p>试运行期间，欢迎广大群众通过本平台预约信访、查询进度，并通过"意见建议类"事项对平台功能提出宝贵意见。我们将根据反馈持续优化改进。</p>'
    }
  ];
  window.XF.announcements = {
    list: function () {
      try { return JSON.parse(localStorage.getItem(ANN_KEY)) || []; }
      catch (e) { return []; }
    },
    seed: function () {
      if (localStorage.getItem('xf_ann_seeded_v2')) return;
      localStorage.setItem(ANN_KEY, JSON.stringify(ANN_SEED));
      localStorage.setItem('xf_ann_seeded_v2', '1');
    },
    save: function (ann) {
      var arr = window.XF.announcements.list().filter(function (a) { return a.id !== ann.id; });
      arr.unshift(ann);
      localStorage.setItem(ANN_KEY, JSON.stringify(arr));
    },
    remove: function (id) {
      var arr = window.XF.announcements.list().filter(function (a) { return a.id !== id; });
      localStorage.setItem(ANN_KEY, JSON.stringify(arr));
    },
    find: function (id) {
      return window.XF.announcements.list().find(function (a) { return a.id === id; });
    },
    /* 渲染公告列表：容器 + 显示条数（最新在前） */
    renderList: function (container, limit) {
      var list = window.XF.announcements.list().slice(0, limit || 50);
      container.innerHTML = '';
      if (!list.length) {
        container.innerHTML = '<p class="empty-tip" style="padding:20px">暂无公告</p>';
        return;
      }
      list.forEach(function (a) {
        var m = a.date.split('-');
        var item = document.createElement('div');
        item.className = 'news-item';
        item.innerHTML =
          '<div class="news-date"><b>' + parseInt(m[2], 10) + '</b><span>' + m[0] + '-' + m[1] + '</span></div>' +
          '<div class="news-body"><h4><a href="news-detail.html?id=' + encodeURIComponent(a.id) + '">' + a.title + '</a></h4>' +
          '<p>' + (a.summary || '') + '</p></div>' +
          '<span class="news-tag">' + a.tag + '</span>';
        container.appendChild(item);
      });
    }
  };
  window.XF.announcements.seed();

  /* ---------- 公告详情渲染 ---------- */
  window.XF.announcements.renderDetail = function (root) {
    var id = new URLSearchParams(window.location.search).get('id') || '';
    var ann = window.XF.announcements.find(id);
    var bodyEl = document.createElement('div');
    bodyEl.className = 'a-body';
    if (!ann) {
      root.innerHTML = '<div class="empty-tip"><p>未找到该公告，可能已被删除或链接有误。</p><p style="margin-top:10px"><a class="btn btn-outline btn-sm" href="news.html">返回公告列表</a></p></div>';
      return;
    }
    bodyEl.innerHTML = ann.body || '<p>（正文暂未发布，请以官方公告为准。）</p>';
    root.innerHTML = '';
    var h1 = document.createElement('h1');
    h1.textContent = ann.title;
    var meta = document.createElement('div');
    meta.className = 'a-meta';
    meta.textContent = '发布时间：' + ann.date + '　来源：厅信访处（演示）';
    root.appendChild(h1);
    root.appendChild(meta);
    root.appendChild(bodyEl);
  };
})();
