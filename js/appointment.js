/* ============================================================
   江苏信访 · 群众网上预约信访平台（设计原型 v2）
   预约流程脚本：4 步向导、三类事项细化、校验、提交、本地存储
   说明：按《信访工作条例》分为申诉求决类 / 意见建议类 / 检举控告类，
   接访单位不对外显示。
   ============================================================ */
(function () {
  'use strict';
  var XF = window.XF;

  /* ---------- 数据定义：三大类 ---------- */
  var CATS = [
    { id: 'appeal', name: '申诉求决类', desc: '反映本人或本单位合法权益受到侵害，请求依法解决的事项' },
    { id: 'suggest', name: '意见建议类', desc: '对公安机关执法管理、政务服务、队伍建设等工作提出意见建议' },
    { id: 'report', name: '检举控告类', desc: '检举、控告公安机关及其民警违法违纪或执法不当等行为' }
  ];

  /* 各大类下的具体事项类型 */
  var SUBTYPES = {
    appeal: [
      { name: '治安管理类' }, { name: '道路交通类' }, { name: '刑事侦查类' },
      { name: '经济金融类' }, { name: '环食药侦类' }, { name: '电信诈骗类' },
      { name: '户籍身份证类' }, { name: '出入境管理类' }, { name: '其他申诉求决事项' }
    ],
    suggest: [
      { name: '治安管理建议' }, { name: '交通管理建议' }, { name: '政务服务建议' },
      { name: '队伍建设建议' }, { name: '其他意见建议' }
    ],
    report: [
      { name: '反映民警违法违纪问题' }, { name: '反映执法不当问题' },
      { name: '反映不作为慢作为问题' }, { name: '其他检举控告事项' }
    ]
  };

  var CAT_HINTS = {
    appeal: '该类事项依法登记受理后，由有关职能部门按规定时限办理。请提前整理好相关证据材料，到场时一并提交。',
    suggest: '意见建议类事项将认真登记、研究论证，对科学合理、具有现实可行性的建议积极采纳并推动落实，无需携带过多材料。',
    report: '检举控告类事项将由专门部门依法依纪核查处理，严禁打击报复举报人。请如实反映情况，不得捏造、歪曲事实，不得诬告、陷害他人。建议留下真实联系方式，便于核查反馈。'
  };

  /* ---------- 接访时间（按周几 + 季节生成时段） ----------
     周一、二、四：上午 8:30-11:30 + 下午（夏秋季 14:00-17:00 / 秋冬季 13:30-16:30）
     周三、五：仅上午 8:30-11:30 */
  function isWinterSeason(dt) { var m = dt.getMonth() + 1; return m >= 10 || m <= 4; }
  function isFullDay(dt) { var d = dt.getDay(); return d === 1 || d === 2 || d === 4; }
  function slotGroupsFor(dt) {
    var groups = [
      { label: '上午（8:30-11:30）', slots: ['08:30-09:10', '09:20-10:00', '10:10-10:50', '11:00-11:30'] }
    ];
    if (isFullDay(dt)) {
      if (isWinterSeason(dt)) {
        groups.push({ label: '下午（13:30-16:30 · 秋冬季作息）', slots: ['13:30-14:10', '14:20-15:00', '15:10-15:50', '16:00-16:30'] });
      } else {
        groups.push({ label: '下午（14:00-17:00 · 夏秋季作息）', slots: ['14:00-14:40', '14:50-15:30', '15:40-16:20', '16:30-17:00'] });
      }
    }
    return groups;
  }

  /* 依据日期+时段生成稳定的"剩余名额"（演示） */
  function remainingFor(date, slot) {
    var h = 0;
    var s = date + slot;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return (h % 9) + 2;
  }

  /* ---------- 页面元素 ---------- */
  var stepper = document.getElementById('stepper');
  var form = document.getElementById('apptForm');
  var successPanel = document.getElementById('successPanel');

  /* 状态 */
  var state = {
    step: 1,
    cat: null, catName: '',
    type: null, typeName: '',
    date: '', dateLabel: '', slot: '',
    name: '', idCard: '', phone: '', code: '', region: '',
    summary: '', materials: '有',
    agreed: false, verified: false
  };
  var genCode = '';

  var steps = [1, 2, 3, 4];

  /* ---------- 步骤条渲染 ---------- */
  var STEP_LABELS = ['选择事项', '选择时间', '填写信息', '确认提交'];
  function renderStepper() {
    stepper.innerHTML = '';
    steps.forEach(function (n) {
      var li = document.createElement('li');
      if (n === state.step) li.className = 'active';
      else if (n < state.step) li.className = 'done';
      var num = document.createElement('span');
      num.className = 'st-num';
      num.textContent = n < state.step ? '✓' : n;
      var label = document.createElement('span');
      label.textContent = STEP_LABELS[n - 1];
      li.appendChild(num); li.appendChild(label);
      stepper.appendChild(li);
    });
  }

  function showStep(n) {
    state.step = n;
    [1, 2, 3, 4].forEach(function (i) {
      document.getElementById('step' + i).hidden = i !== n;
    });
    document.querySelectorAll('.btn-prev').forEach(function (b) {
      b.style.visibility = n === 1 ? 'hidden' : 'visible';
    });
    renderStepper();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 第一步：类别 + 具体类型 ---------- */
  function buildCats() {
    var wrap = document.getElementById('catGrid');
    CATS.forEach(function (c) {
      var label = document.createElement('label');
      label.className = 'opt-card';
      label.innerHTML =
        '<input type="radio" name="cat" value="' + c.id + '" aria-label="' + c.name + '">' +
        '<div class="opt-title">' + c.name + '</div>' +
        '<div class="opt-desc">' + c.desc + '</div>';
      label.addEventListener('click', function () {
        wrap.querySelectorAll('.opt-card').forEach(function (x) { x.classList.remove('checked'); });
        label.classList.add('checked');
        state.cat = c.id;
        state.catName = c.name;
        state.type = null; state.typeName = '';
        buildSubtypes();
        document.getElementById('subWrap').hidden = false;
        var hint = document.getElementById('typeHint');
        hint.textContent = CAT_HINTS[c.id];
        hint.classList.add('show');
        validateStep1();
      });
      wrap.appendChild(label);
    });
  }

  function buildSubtypes() {
    var wrap = document.getElementById('subGrid');
    wrap.innerHTML = '';
    var hint = document.getElementById('typeHint');
    hint.classList.remove('show');
    (SUBTYPES[state.cat] || []).forEach(function (t) {
      var label = document.createElement('label');
      label.className = 'opt-card';
      label.innerHTML =
        '<input type="radio" name="subtype" value="' + t.name + '" aria-label="' + t.name + '">' +
        '<div class="opt-title">' + t.name + '</div>';
      label.addEventListener('click', function () {
        wrap.querySelectorAll('.opt-card').forEach(function (x) { x.classList.remove('checked'); });
        label.classList.add('checked');
        state.type = t.name;
        state.typeName = t.name;
        validateStep1();
      });
      wrap.appendChild(label);
    });
  }

  /* ---------- 第二步：日期与时段 ---------- */
  var dateMap = {};
  function buildDates() {
    var wrap = document.getElementById('dateChips');
    XF.nextWorkdays(5).forEach(function (dt) {
      var label = document.createElement('label');
      label.className = 'date-chip';
      var week = ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
      var md = (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
      var tag = isFullDay(dt) ? '全天' : '仅上午';
      var ds = XF.fmtDate(dt);
      dateMap[ds] = dt;
      label.innerHTML =
        '<input type="radio" name="date" value="' + ds + '" style="position:absolute;opacity:0">' +
        '<div class="d">' + week + '（' + md + ' · ' + tag + '）</div>' +
        '<div class="t">' + ds + '</div>';
      label.addEventListener('click', function () {
        wrap.querySelectorAll('.date-chip').forEach(function (c) { c.classList.remove('checked'); });
        label.classList.add('checked');
        state.date = ds;
        state.dateLabel = ds + '（' + week + '）';
        buildSlots();
      });
      wrap.appendChild(label);
    });
  }

  function buildSlots() {
    var wrap = document.getElementById('slotGroups');
    wrap.innerHTML = '';
    state.slot = '';
    if (!state.date) return;
    var dt = dateMap[state.date] || new Date();
    slotGroupsFor(dt).forEach(function (g) {
      var title = document.createElement('div');
      title.className = 'slot-group-title';
      title.textContent = g.label;
      wrap.appendChild(title);
      var grid = document.createElement('div');
      grid.className = 'slot-grid';
      g.slots.forEach(function (sl) {
        var remain = remainingFor(state.date, sl);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot' + (remain <= 0 ? ' full' : '');
        btn.innerHTML = '<span>' + sl + '</span><span class="n">' +
          (remain > 0 ? '剩余 ' + remain + ' 席' : '已约满') + '</span>';
        if (remain > 0) {
          btn.addEventListener('click', function () {
            wrap.querySelectorAll('.slot').forEach(function (c) { c.classList.remove('checked'); });
            btn.classList.add('checked');
            state.slot = sl;
            validateStep2();
          });
        }
        grid.appendChild(btn);
      });
      wrap.appendChild(grid);
    });
  }

  /* ---------- 第三步：填写信息 ---------- */
  var fields = {
    name: document.getElementById('fName'),
    idCard: document.getElementById('fIdCard'),
    phone: document.getElementById('fPhone'),
    code: document.getElementById('fCode'),
    region: document.getElementById('fRegion'),
    summary: document.getElementById('fSummary')
  };

  function initFields() {
    document.querySelectorAll('input[name="materials"]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) state.materials = r.value; });
    });
    document.getElementById('ckAgree').addEventListener('change', function (e) {
      state.agreed = e.target.checked;
      validateStep3();
    });
    document.getElementById('ckVerify').addEventListener('change', function (e) {
      state.verified = e.target.checked;
      validateStep3();
    });
    fields.summary.addEventListener('input', function () {
      var v = fields.summary.value;
      if (v.length > 200) fields.summary.value = v.slice(0, 200);
      document.getElementById('charCount').textContent = fields.summary.value.length + ' / 200 字';
      validateStep3();
    });
    [fields.name, fields.idCard, fields.phone, fields.code, fields.region].forEach(function (el) {
      if (el) el.addEventListener('input', function () { validateStep3(); });
    });
  }

  /* 发送验证码（演示） */
  var codeBtn = document.getElementById('btnCode');
  codeBtn.addEventListener('click', function () {
    if (!XF.validMobile(fields.phone.value)) {
      setFieldError(fields.phone, '请输入正确的11位手机号码');
      return;
    }
    genCode = String(Math.floor(100000 + Math.random() * 900000));
    window.showToast('【演示】短信验证码：' + genCode + '，5分钟内有效。');
    var left = 60;
    codeBtn.disabled = true;
    codeBtn.textContent = left + ' 秒后重新发送';
    var timer = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(timer);
        codeBtn.disabled = false;
        codeBtn.textContent = '获取验证码';
      } else {
        codeBtn.textContent = left + ' 秒后重新发送';
      }
    }, 1000);
  });

  /* ---------- 校验工具 ---------- */
  function setFieldError(el, msg) {
    var field = el.closest('.field');
    if (!field) return;
    field.classList.add('invalid');
    var err = field.querySelector('.err-msg');
    if (err && msg) err.textContent = msg;
  }
  function clearFieldError(el) {
    var field = el.closest('.field');
    if (field) field.classList.remove('invalid');
  }

  function validateStep1() {
    var ok = !!state.cat && !!state.type;
    document.getElementById('btnNext1').disabled = !ok;
    return ok;
  }

  function validateStep2() {
    var ok = !!state.date && !!state.slot;
    document.getElementById('btnNext2').disabled = !ok;
    return ok;
  }

  function validateStep3() {
    var ok = true;
    if (!fields.name.value.trim() || fields.name.value.trim().length < 2) {
      setFieldError(fields.name, '请输入真实姓名（不少于2个字符）'); ok = false;
    } else clearFieldError(fields.name);
    if (!XF.validIdCard(fields.idCard.value)) {
      setFieldError(fields.idCard, '请输入正确的18位身份证号码'); ok = false;
    } else clearFieldError(fields.idCard);
    if (!XF.validMobile(fields.phone.value)) {
      setFieldError(fields.phone, '请输入正确的11位手机号码'); ok = false;
    } else clearFieldError(fields.phone);
    if (fields.code.value.trim() !== genCode || !genCode) {
      setFieldError(fields.code, genCode ? '验证码不正确，请重新获取' : '请先点击"获取验证码"'); ok = false;
    } else clearFieldError(fields.code);
    if (!fields.region.value) {
      setFieldError(fields.region, '请选择所在地区'); ok = false;
    } else clearFieldError(fields.region);
    if (fields.summary.value.trim().length < 5) {
      setFieldError(fields.summary, '请简要描述您的信访诉求（不少于5个字）'); ok = false;
    } else clearFieldError(fields.summary);
    if (!state.agreed) ok = false;
    if (!state.verified) ok = false;
    document.getElementById('btnNext3').disabled = !ok;
    return ok;
  }

  /* ---------- 第四步：确认与提交 ---------- */
  function renderConfirm() {
    var map = [
      ['信访事项类别', state.catName + ' · ' + state.typeName],
      ['预约日期', state.dateLabel],
      ['预约时段', state.slot],
      ['来访人姓名', state.name.trim()],
      ['身份证号', state.idCard.trim().replace(/^(.{6}).*(.{4})$/, '$1********$2')],
      ['手机号码', XF.maskPhone(state.phone)],
      ['所在地区', state.region],
      ['信访诉求摘要', state.summary.trim()],
      ['是否携带材料', state.materials]
    ];
    var list = document.getElementById('confirmList');
    list.innerHTML = '';
    map.forEach(function (row) {
      var div = document.createElement('div');
      div.style.cssText = 'display:contents';
      var dt = document.createElement('dt');
      dt.textContent = row[0];
      var dd = document.createElement('dd');
      dd.textContent = row[1];
      div.appendChild(dt); div.appendChild(dd);
      list.appendChild(div);
    });
  }

  /* 提交：生成预约编号并保存（初始状态：待审核） */
  function submit() {
    var now = new Date();
    var id = 'YY' + XF.fmtDate(now).replace(/-/g, '') +
      String(Math.floor(Math.random() * 9000) + 1000);
    var record = {
      id: id,
      name: state.name.trim(),
      idCard: state.idCard.trim().toUpperCase(),
      phone: state.phone.trim(),
      region: state.region,
      cat: state.catName,
      type: state.typeName,
      date: state.date,
      slot: state.slot,
      summary: state.summary.trim(),
      materials: state.materials,
      status: '待审核',
      createdAt: XF.fmtDateTime(now),
      timeline: [
        { label: '预约提交成功', time: XF.fmtDateTime(now) },
        { label: '审核通过，短信通知（预计1个工作日内）', time: '待审核' },
        { label: '现场接访', time: state.dateLabel + ' ' + state.slot },
        { label: '办理答复（受理之日起60日内办结）', time: '待办理' }
      ]
    };
    XF.storage.save(record);

    /* 渲染成功面板 */
    form.hidden = true;
    document.getElementById('ticketId').textContent = id;
    document.getElementById('ticketName').textContent = XF.maskName(record.name);
    document.getElementById('ticketType').textContent = record.cat + ' · ' + record.type;
    document.getElementById('ticketTime').textContent = state.dateLabel + ' ' + record.slot;
    document.getElementById('ticketMaterials').textContent = record.materials === '有' ? '请携带信访材料原件及身份证原件' : '请携带身份证原件';
    document.getElementById('btnSendSms').addEventListener('click', function () {
      window.showToast('演示：预约短信已发送至 ' + XF.maskPhone(record.phone));
    });
    document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
    successPanel.hidden = false;
    renderStepper();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 导航按钮 ---------- */
  document.getElementById('btnNext1').addEventListener('click', function () {
    if (validateStep1()) showStep(2);
  });
  document.getElementById('btnNext2').addEventListener('click', function () {
    if (validateStep2()) showStep(3);
  });
  document.getElementById('btnNext3').addEventListener('click', function () {
    if (validateStep3()) { renderConfirm(); showStep(4); }
  });
  document.querySelectorAll('.btn-prev').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (state.step > 1) showStep(state.step - 1);
    });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit();
  });

  /* ---------- 初始化 ---------- */
  buildCats();
  buildDates();
  initFields();
  showStep(1);
})();
