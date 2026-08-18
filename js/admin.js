/* ============================================================
   江苏信访 · 群众网上预约信访平台（设计原型 v2）
   后台管理脚本：登录、工作台统计、预约审核流转、公告管理
   ============================================================ */
(function () {
  'use strict';
  var XF = window.XF;

  var STATUS_MAP = {
    '待审核': { cls: 'badge-review', text: '待审核' },
    '待接访': { cls: 'badge-pending', text: '待接访' },
    '已接访': { cls: 'badge-visited', text: '已接访' },
    '已办结': { cls: 'badge-done', text: '已办结' },
    '已驳回': { cls: 'badge-reject', text: '已驳回' },
    '已取消': { cls: 'badge-cancel', text: '已取消' }
  };
  var VIEW_TITLES = { dashboard: '工作台', appointments: '预约管理', notices: '公告管理' };

  var loginView = document.getElementById('loginView');
  var adminView = document.getElementById('adminView');

  /* ---------- 登录 ---------- */
  function isLoggedIn() { return sessionStorage.getItem('xf_admin') === '1'; }
  function showApp() {
    loginView.hidden = true;
    adminView.hidden = false;
  }
  function showLogin() {
    loginView.hidden = false;
    adminView.hidden = true;
  }
  if (isLoggedIn()) showApp(); else showLogin();

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = document.getElementById('loginUser').value.trim();
    var p = document.getElementById('loginPass').value;
    var uf = document.getElementById('loginUser').closest('.field');
    var pf = document.getElementById('loginPass').closest('.field');
    var ok = true;
    if (!u) { uf.classList.add('invalid'); ok = false; } else uf.classList.remove('invalid');
    if (!p) { pf.classList.add('invalid'); ok = false; } else pf.classList.remove('invalid');
    if (!ok) return;
    if (u === 'admin' && p === 'admin123') {
      sessionStorage.setItem('xf_admin', '1');
      showApp();
      renderDashboard();
      window.showToast('登录成功，欢迎使用后台管理');
    } else {
      window.showToast('用户名或密码错误（演示账号 admin / admin123）', true);
    }
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    sessionStorage.removeItem('xf_admin');
    showLogin();
    document.getElementById('loginPass').value = '';
    window.showToast('已退出登录');
  });

  /* ---------- 视图切换 ---------- */
  var currentView = 'dashboard';
  document.querySelectorAll('.admin-side a[data-view]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      switchView(a.getAttribute('data-view'));
    });
  });
  function switchView(v) {
    currentView = v;
    document.querySelectorAll('.admin-side a[data-view]').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-view') === v);
    });
    ['dashboard', 'appointments', 'notices'].forEach(function (k) {
      document.getElementById('view-' + k).hidden = k !== v;
    });
    document.getElementById('viewTitle').textContent = VIEW_TITLES[v];
    if (v === 'dashboard') renderDashboard();
    if (v === 'appointments') renderApptTable();
    if (v === 'notices') renderNoticeTable();
  }

  /* ---------- 工作台 ---------- */
  function renderDashboard() {
    var list = XF.storage.list();
    var today = XF.fmtDate(new Date());
    var cnt = function (status) { return list.filter(function (r) { return r.status === status; }).length; };
    document.getElementById('sTotal').textContent = list.length;
    document.getElementById('sToday').textContent = list.filter(function (r) {
      return (r.createdAt || '').slice(0, 10) === today;
    }).length;
    document.getElementById('sReview').textContent = cnt('待审核');
    document.getElementById('sPending').textContent = cnt('待接访');
    document.getElementById('sDone').textContent = cnt('已办结');
    document.getElementById('sCancel').textContent = cnt('已取消') + cnt('已驳回');

    /* 近7日趋势（含今日） */
    var chart = document.getElementById('chartBars');
    chart.innerHTML = '';
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var dt = new Date();
      dt.setDate(dt.getDate() - i);
      days.push(XF.fmtDate(dt));
    }
    var counts = days.map(function (d) {
      return list.filter(function (r) { return (r.createdAt || '').slice(0, 10) === d; }).length;
    });
    var max = Math.max.apply(null, counts.concat([1]));
    days.forEach(function (d, i) {
      var div = document.createElement('div');
      div.className = 'bar';
      div.innerHTML = '<i style="height:' + Math.round(counts[i] / max * 100) + '%"></i>' +
        '<span>' + d.slice(5) + (counts[i] ? '（' + counts[i] + '）' : '') + '</span>';
      chart.appendChild(div);
    });

    /* 待审核快速处理 */
    var quick = document.getElementById('quickList');
    var review = list.filter(function (r) { return r.status === '待审核'; });
    quick.innerHTML = '';
    if (!review.length) {
      quick.innerHTML = '<p class="empty-tip" style="padding:14px 0">暂无待审核预约，全部处理完毕 🎉</p>';
      return;
    }
    review.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'news-item';
      row.innerHTML =
        '<div class="news-body"><h4>' + rec.id + '　' + XF.maskName(rec.name) +
        '（' + rec.cat + ' · ' + rec.type + '）</h4>' +
        '<p>' + rec.date + ' ' + rec.slot + '　' + (rec.summary || '').slice(0, 40) + '</p></div>' +
        '<div class="ta-actions">' +
        '<button type="button" class="btn btn-sm btn-primary" data-ok="' + rec.id + '">通过</button>' +
        '<button type="button" class="btn btn-sm btn-outline" data-no="' + rec.id + '" style="border-color:var(--red);color:var(--red)">驳回</button>' +
        '</div>';
      quick.appendChild(row);
    });
  }

  /* ---------- 预约状态流转 ---------- */
  function setStatus(rec, status, label) {
    rec.status = status;
    rec.timeline.push({ label: label, time: XF.fmtDateTime(new Date()) });
    XF.storage.update(rec);
  }
  function approve(rec) {
    setStatus(rec, '待接访', '审核通过，已短信通知预约人');
  }
  function reject(rec) {
    setStatus(rec, '已驳回', '审核未通过，已短信通知预约人');
  }
  function markVisited(rec) {
    setStatus(rec, '已接访', '现场接访完成');
  }
  function markDone(rec) {
    setStatus(rec, '已办结', '事项办理答复，予以办结');
  }
  function adminCancel(rec) {
    setStatus(rec, '已取消', '后台取消预约');
  }

  document.getElementById('quickList').addEventListener('click', function (e) {
    var okBtn = e.target.closest('[data-ok]');
    var noBtn = e.target.closest('[data-no]');
    if (!okBtn && !noBtn) return;
    var id = okBtn ? okBtn.getAttribute('data-ok') : noBtn.getAttribute('data-no');
    var rec = XF.storage.find(id);
    if (!rec) return;
    if (okBtn) {
      approve(rec);
      window.showToast('已通过：' + id + '，预约人将收到短信通知');
    } else {
      if (!confirm('确定驳回该预约吗？将短信通知预约人审核未通过。')) return;
      reject(rec);
      window.showToast('已驳回：' + id);
    }
    renderDashboard();
    renderApptTable();
  });

  /* ---------- 预约管理 ---------- */
  var currentStatus = '';
  var currentKeyword = '';
  document.getElementById('btnFilter').addEventListener('click', function () {
    currentStatus = document.getElementById('fStatus').value;
    currentKeyword = document.getElementById('fKeyword').value.trim();
    renderApptTable();
  });
  document.getElementById('btnReset').addEventListener('click', function () {
    currentStatus = '';
    currentKeyword = '';
    document.getElementById('fStatus').value = '';
    document.getElementById('fKeyword').value = '';
    renderApptTable();
  });
  document.getElementById('fKeyword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnFilter').click(); }
  });

  function filterList() {
    return XF.storage.list().filter(function (r) {
      if (currentStatus && r.status !== currentStatus) return false;
      if (currentKeyword) {
        var k = currentKeyword.toLowerCase();
        var hit = r.id.toLowerCase().indexOf(k) !== -1 ||
          r.name.toLowerCase().indexOf(k) !== -1 ||
          String(r.phone).indexOf(k) !== -1 ||
          (r.type || '').indexOf(k) !== -1;
        if (!hit) return false;
      }
      return true;
    });
  }

  function statusBadge(status) {
    var s = STATUS_MAP[status] || STATUS_MAP['待审核'];
    return '<span class="badge ' + s.cls + '">' + s.text + '</span>';
  }

  function actionButtons(rec) {
    var html = '';
    if (rec.status === '待审核') {
      html += '<button type="button" class="btn btn-sm btn-primary" data-act="approve" data-id="' + rec.id + '">通过</button>' +
        '<button type="button" class="btn btn-sm btn-outline" data-act="reject" data-id="' + rec.id + '" style="border-color:var(--red);color:var(--red)">驳回</button>';
    }
    if (rec.status === '待接访') {
      html += '<button type="button" class="btn btn-sm btn-blue" data-act="visit" data-id="' + rec.id + '">标记已接访</button>';
    }
    if (rec.status === '已接访') {
      html += '<button type="button" class="btn btn-sm btn-primary" data-act="done" data-id="' + rec.id + '">标记办结</button>';
    }
    if (rec.status === '待审核' || rec.status === '待接访') {
      html += '<button type="button" class="btn btn-sm btn-outline" data-act="cancel" data-id="' + rec.id + '" style="border-color:var(--blue-600)">取消</button>';
    }
    if (rec.status !== '待审核' && rec.status !== '待接访') {
      html += '<button type="button" class="btn btn-sm btn-outline" data-act="del" data-id="' + rec.id + '" style="border-color:var(--muted);color:var(--muted)">删除</button>';
    }
    return html || '<span style="color:var(--muted)">—</span>';
  }

  function renderApptTable() {
    var list = filterList();
    var tbody = document.getElementById('apptTable');
    document.getElementById('apptEmpty').hidden = list.length > 0;
    tbody.innerHTML = '';
    list.forEach(function (rec) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><b>' + rec.id + '</b><br><span style="font-size:12px;color:var(--muted)">' +
        XF.maskName(rec.name) + ' ' + XF.maskPhone(rec.phone) + '</span></td>' +
        '<td>' + (rec.cat ? rec.cat + ' · ' : '') + rec.type +
        '<br><span style="font-size:12px;color:var(--muted)">' + (rec.summary || '').slice(0, 30) + '</span></td>' +
        '<td>' + rec.date + '<br><span style="font-size:12px;color:var(--muted)">' + rec.slot + '</span></td>' +
        '<td>' + statusBadge(rec.status) + '</td>' +
        '<td>' + rec.createdAt + '</td>' +
        '<td><div class="ta-actions">' + actionButtons(rec) + '</div></td>';
      tbody.appendChild(tr);
    });
  }

  document.getElementById('apptTable').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var rec = XF.storage.find(btn.getAttribute('data-id'));
    if (!rec) return;
    var act = btn.getAttribute('data-act');
    if (act === 'approve') {
      approve(rec);
      window.showToast('已通过：' + rec.id);
    } else if (act === 'reject') {
      if (!confirm('确定驳回该预约吗？')) return;
      reject(rec);
      window.showToast('已驳回：' + rec.id);
    } else if (act === 'visit') {
      markVisited(rec);
      window.showToast('已标记接访：' + rec.id);
    } else if (act === 'done') {
      if (!confirm('确认该事项已办理答复并办结？')) return;
      markDone(rec);
      window.showToast('已办结：' + rec.id);
    } else if (act === 'cancel') {
      if (!confirm('确定取消该预约吗？')) return;
      adminCancel(rec);
      window.showToast('已取消：' + rec.id);
    } else if (act === 'del') {
      if (!confirm('确定删除该预约记录吗？删除后不可恢复。')) return;
      XF.storage.remove(rec.id);
      window.showToast('已删除：' + rec.id);
    }
    renderApptTable();
    renderDashboard();
  });

  /* ---------- 公告管理 ---------- */
  var editingId = null;
  document.getElementById('btnResetNotice').addEventListener('click', resetNoticeForm);
  function resetNoticeForm() {
    editingId = null;
    document.getElementById('noticeForm').reset();
    document.getElementById('nDate').value = XF.fmtDate(new Date());
    document.getElementById('nTag').value = '公告';
    document.getElementById('noticeFormTitle').textContent = '新增公告';
    document.getElementById('btnSaveNotice').textContent = '发布公告';
    document.getElementById('noticeForm').querySelectorAll('.field').forEach(function (f) {
      f.classList.remove('invalid');
    });
  }
  resetNoticeForm();

  document.getElementById('noticeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = document.getElementById('nTitle').value.trim();
    var date = document.getElementById('nDate').value;
    var summary = document.getElementById('nSummary').value.trim();
    var body = document.getElementById('nBody').value.trim();
    var ok = true;
    var fields = [
      ['nTitle', '请输入公告标题'],
      ['nDate', '请选择发布日期'],
      ['nSummary', '请输入公告摘要']
    ];
    fields.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      var f = el.closest('.field');
      var v = el.value.trim();
      if (!v) { f.classList.add('invalid'); f.querySelector('.err-msg').textContent = pair[1]; ok = false; }
      else f.classList.remove('invalid');
    });
    if (!ok) return;
    var ann = {
      id: editingId || ('news-' + Date.now()),
      title: title, date: date,
      tag: document.getElementById('nTag').value,
      summary: summary, body: body
    };
    XF.announcements.save(ann);
    window.showToast(editingId ? '公告已更新' : '公告已发布');
    resetNoticeForm();
    renderNoticeTable();
  });

  function renderNoticeTable() {
    var list = XF.announcements.list();
    var tbody = document.getElementById('noticeTable');
    document.getElementById('noticeEmpty').hidden = list.length > 0;
    tbody.innerHTML = '';
    list.forEach(function (a) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><a href="news-detail.html?id=' + encodeURIComponent(a.id) + '" target="_blank">' + a.title + '</a></td>' +
        '<td>' + a.date + '</td>' +
        '<td><span class="news-tag">' + a.tag + '</span></td>' +
        '<td><div class="ta-actions">' +
        '<button type="button" class="btn btn-sm btn-blue" data-edit="' + a.id + '">编辑</button>' +
        '<button type="button" class="btn btn-sm btn-outline" data-delann="' + a.id + '" style="border-color:var(--red);color:var(--red)">删除</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });
  }

  document.getElementById('noticeTable').addEventListener('click', function (e) {
    var editBtn = e.target.closest('[data-edit]');
    var delBtn = e.target.closest('[data-delann]');
    if (editBtn) {
      var a = XF.announcements.find(editBtn.getAttribute('data-edit'));
      if (!a) return;
      editingId = a.id;
      document.getElementById('nTitle').value = a.title;
      document.getElementById('nDate').value = a.date;
      document.getElementById('nTag').value = a.tag;
      document.getElementById('nSummary').value = a.summary;
      document.getElementById('nBody').value = a.body || '';
      document.getElementById('noticeFormTitle').textContent = '编辑公告：' + a.title.slice(0, 18);
      document.getElementById('btnSaveNotice').textContent = '保存修改';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (delBtn) {
      if (!confirm('确定删除该公告吗？前台将立即不再显示。')) return;
      XF.announcements.remove(delBtn.getAttribute('data-delann'));
      window.showToast('公告已删除');
      renderNoticeTable();
    }
  });

  /* ---------- 初始化 ---------- */
  renderDashboard();
  renderApptTable();
  renderNoticeTable();
})();
