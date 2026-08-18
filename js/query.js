/* ============================================================
   江苏信访 · 群众网上预约信访平台（设计原型 v2）
   预约查询脚本：编号+身份校验、状态时间线、在线取消
   ============================================================ */
(function () {
  'use strict';
  var XF = window.XF;

  var form = document.getElementById('queryForm');
  var fId = document.getElementById('qId');
  var fCode = document.getElementById('qCode');
  var resultBox = document.getElementById('resultBox');
  var emptyTip = document.getElementById('emptyTip');

  var STATUS_MAP = {
    '待审核': { cls: 'badge-review', text: '待审核' },
    '待接访': { cls: 'badge-pending', text: '待接访' },
    '已接访': { cls: 'badge-visited', text: '已接访' },
    '已办结': { cls: 'badge-done', text: '已办结' },
    '已驳回': { cls: 'badge-reject', text: '审核未通过' },
    '已取消': { cls: 'badge-cancel', text: '已取消' }
  };
  var CANCELABLE = ['待审核', '待接访'];

  function clearError(el) {
    var f = el.closest('.field');
    if (f) f.classList.remove('invalid');
  }
  function setError(el, msg) {
    var f = el.closest('.field');
    if (!f) return;
    f.classList.add('invalid');
    var err = f.querySelector('.err-msg');
    if (err && msg) err.textContent = msg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = fId.value.trim();
    var code = fCode.value.trim();
    var ok = true;

    if (!/^YY\d{12}$/.test(id.toUpperCase())) {
      setError(fId, '预约编号格式为 YY + 12位数字，如 YY202607150001'); ok = false;
    } else clearError(fId);
    if (!code || code.length < 4) {
      setError(fCode, '请输入身份证号后6位或手机号后4位'); ok = false;
    } else clearError(fCode);
    if (!ok) return;

    var rec = XF.storage.find(id);
    var matched = false;
    if (rec) {
      var idTail = rec.idCard.slice(-6);
      var phoneTail = rec.phone.slice(-4);
      matched = (code === idTail) || (code === phoneTail);
    }

    emptyTip.hidden = true;
    resultBox.hidden = true;

    if (!rec || !matched) {
      emptyTip.hidden = false;
      return;
    }

    render(rec);
  });

  function render(rec) {
    var st = STATUS_MAP[rec.status] || STATUS_MAP['待审核'];
    document.getElementById('rId').textContent = rec.id;
    document.getElementById('rStatus').textContent = st.text;
    document.getElementById('rStatus').className = 'badge ' + st.cls;
    document.getElementById('rName').textContent = XF.maskName(rec.name);
    document.getElementById('rType').textContent = (rec.cat ? rec.cat + ' · ' : '') + rec.type;
    document.getElementById('rState').textContent = st.text;
    document.getElementById('rDate').textContent = rec.date + ' ' + rec.slot;
    document.getElementById('rSummary').textContent = rec.summary;

    /* 时间线 */
    var tl = document.getElementById('timeline');
    tl.innerHTML = '';
    var last = rec.timeline.length - 1;
    rec.timeline.forEach(function (item, i) {
      var div = document.createElement('div');
      if (rec.status === '已取消' && i === last) div.className = 'tl-item canceled';
      else if (i === last) div.className = 'tl-item current';
      else div.className = 'tl-item done';
      div.innerHTML = '<div class="tl-label">' + item.label + '</div>' +
        '<div class="tl-time">' + item.time + '</div>';
      tl.appendChild(div);
    });

    /* 取消按钮（仅待审核/待接访可取消） */
    var cancelWrap = document.getElementById('cancelWrap');
    var btnCancel = document.getElementById('btnCancel');
    if (CANCELABLE.indexOf(rec.status) !== -1) {
      cancelWrap.hidden = false;
      btnCancel.onclick = function () {
        if (!confirm('确定取消本次预约吗？取消后无法恢复，如需办理请重新预约。')) return;
        rec.status = '已取消';
        rec.timeline.push({ label: '预约已取消', time: XF.fmtDateTime(new Date()) });
        XF.storage.update(rec);
        window.showToast('预约已取消');
        render(rec);
      };
    } else {
      cancelWrap.hidden = true;
    }

    resultBox.hidden = false;
  }

  /* 演示快速填入 */
  var demoBtn = document.getElementById('btnDemo');
  if (demoBtn) {
    demoBtn.addEventListener('click', function () {
      fId.value = 'YY202607150001';
      fCode.value = '150033';
      clearError(fId); clearError(fCode);
      window.showToast('已填入演示数据，点击"查询预约"查看');
    });
  }
})();
