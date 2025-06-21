 // تكوين البوت والإعدادات
const CONFIG = {
  token: '7957590790:AAGzBJSwZmx_SCFyNmOVOFKb3g3c3Uh2n7c',
  apiEndpoint: 'https://api.telegram.org/bot',
  localStorageKey: 'telegram-bot-sent-messages'
};

// عناصر DOM
const elements = {
  status: document.getElementById('status'),
  message: document.getElementById('message'), // textarea
  sendBtn: document.getElementById('sendBtn'),
  feedback: document.getElementById('feedback'),
  sentMessagesList: document.getElementById('sentMessagesList'),
  replyPreview: document.getElementById('replyPreview'),
  replyText: document.getElementById('replyText'),
  cancelReplyBtn: document.getElementById('cancelReplyBtn'),
  charCounter: document.getElementById('charCounter'),
  typingStatus: document.getElementById('typingStatus'),
  clearDeletedBtn: document.getElementById('clearDeletedBtn'),
  imageInput: document.getElementById('imageInput'),
  uploadImageBtn: document.getElementById('uploadImageBtn'),
  imageUploadLabel: document.querySelector('.image-upload-label'),
  imagePreview: document.getElementById('imagePreview'),
  name: document.getElementById('name'),
  phone: document.getElementById('phone')
};

// حالة التطبيق
let appState = {
  chatId: null,
  isConnected: false,
  sentMessages: [],
  replyTo: null
};

// مؤقتات الكتابة والحالة
let typingTimer, idleTimer;
let lastStatus = { message: '', type: '' };

// الصورة المختارة
let selectedImage = null;

// دوال مساعدة
const utils = {
  validateInput(input) {
    return typeof input === 'string' && input.trim().length > 0 && input.length <= 1000;
  },

  showLoader(element, message = 'جارٍ المعالجة...') {
    element.innerHTML = `
      <div class="spinner" role="status" aria-live="polite" aria-label="${message}"></div>
      <span>${message}</span>
    `;
  },

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  updateStatus(message, type = 'info') {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
  },

  saveDraft() {
    localStorage.setItem('telegram-bot-draft', elements.message.value);
    localStorage.setItem('telegram-bot-name', elements.name.value);
    localStorage.setItem('telegram-bot-phone', elements.phone.value);
  },

  loadDraft() {
    const draft = localStorage.getItem('telegram-bot-draft');
    const name = localStorage.getItem('telegram-bot-name');
    const phone = localStorage.getItem('telegram-bot-phone');
    if (draft) elements.message.value = draft;
    if (name) elements.name.value = name;
    if (phone) elements.phone.value = phone;
  },

  saveSentMessages() {
    try {
      localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(appState.sentMessages));
    } catch (e) {
      console.warn('فشل حفظ الرسائل المرسلة محليًا', e);
    }
  },

  loadSentMessages() {
    try {
      const data = localStorage.getItem(CONFIG.localStorageKey);
      appState.sentMessages = data ? JSON.parse(data) : [];
    } catch (e) {
      appState.sentMessages = [];
    }
  },

  renderSentMessages() {
    elements.sentMessagesList.innerHTML = '';
    if (appState.sentMessages.length === 0) {
      elements.sentMessagesList.innerHTML =
        '<p style="color: rgba(255,255,255,0.6); font-style: italic;">لا توجد رسائل مرسلة حتى الآن.</p>';
      return;
    }

    appState.sentMessages.forEach((msg, index) => {
      const item = document.createElement('div');
      item.className = 'sent-message-item';
      item.setAttribute('role', 'listitem');
      item.style.cursor = msg.deleted ? 'default' : 'pointer';
      item.title = msg.deleted ? 'هذه الرسالة تم حذفها' : 'انقر للرد على هذه الرسالة';

      if (msg.deleted) {
        item.style.color = '#f44336';
        item.style.opacity = '0.6';
        item.style.fontStyle = 'italic';
        item.style.textDecoration = 'line-through';
        item.style.background = 'rgba(244,67,54,0.08)';
      } else {
        item.style.color = '#e0e0e0';
        item.style.opacity = '1';
        item.style.fontStyle = 'normal';
        item.style.textDecoration = 'none';
        item.style.background = '';
      }

      const safeText = msg.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');

      const textDiv = document.createElement('div');
      textDiv.className = 'sent-message-text';

      if (msg.reply_to_text) {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'reply-quote';
        replyDiv.innerHTML = msg.reply_to_text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/\n/g, '<br>');
        textDiv.appendChild(replyDiv);
      }

      const messageContent = document.createElement('div');
      messageContent.innerHTML = safeText;
      textDiv.appendChild(messageContent);

      if (msg.is_image) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'sent-message-image';
        imageDiv.innerHTML = '<i class="fa fa-image" aria-hidden="true"></i> صورة';
        textDiv.appendChild(imageDiv);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('aria-label', `حذف الرسالة رقم ${index + 1}`);
      deleteBtn.title = 'حذف الرسالة';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.disabled = msg.deleted;
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!msg.deleted) await deleteSentMessage(index);
      });

      item.appendChild(textDiv);
      item.appendChild(deleteBtn);

      if (!msg.deleted) {
        item.addEventListener('click', () => {
          setReplyToMessage(index);
        });
      }

      elements.sentMessagesList.appendChild(item);
    });
  },

  addSentMessage(msg) {
    appState.sentMessages.unshift(msg);
    utils.saveSentMessages();
    utils.renderSentMessages();
  }
};

// API
const api = {
  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${CONFIG.apiEndpoint}${CONFIG.token}/${endpoint}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body || null
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async testConnection() {
    try {
      const data = await this.makeRequest('getMe');
      return data.ok;
    } catch {
      return false;
    }
  },

  async getUpdates() {
    try {
      const data = await this.makeRequest('getUpdates');
      return data.ok ? data.result : [];
    } catch {
      return [];
    }
  }
};

// تعيين رسالة للرد عليها
function setReplyToMessage(index) {
  const msg = appState.sentMessages[index];
  if (!msg) return;
  appState.replyTo = msg;
  elements.replyPreview.style.display = 'block';
  elements.replyText.textContent = msg.text.length > 100 ? msg.text.slice(0, 100) + '...' : msg.text;
  elements.message.focus();
}

// إلغاء الرد
function cancelReply() {
  appState.replyTo = null;
  elements.replyPreview.style.display = 'none';
  elements.replyText.textContent = '';
}

// حذف رسالة من البوت والموقع
async function deleteMessage(chatId, messageId) {
  try {
    const response = await fetch(`${CONFIG.apiEndpoint}${CONFIG.token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
    const data = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}

async function deleteSentMessage(index) {
  if (index < 0 || index >= appState.sentMessages.length) return;
  const msg = appState.sentMessages[index];
  if (!msg.message_id) {
    appState.sentMessages.splice(index, 1);
    utils.saveSentMessages();
    utils.renderSentMessages();
    utils.showNotification('تم حذف الرسالة محليًا', 'warning');
    return;
  }
  const success = await deleteMessage(appState.chatId, msg.message_id);
  if (success) {
    appState.sentMessages[index].deleted = true;
    utils.saveSentMessages();
    utils.renderSentMessages();
    utils.showNotification('تم حذف الرسالة من البوت، وتم تمييزها كمحذوفة', 'error');
  } else {
    utils.showNotification('فشل حذف الرسالة من البوت', 'error');
  }
}

// تكبير تلقائي للـ textarea مع النص
function autoResize() {
  elements.message.style.height = 'auto';
  elements.message.style.height = Math.min(elements.message.scrollHeight, 260) + 'px';
}

// تحديث عداد الحروف مع ألوان ديناميكية
function updateCharCounter() {
  const length = elements.message.value.length;
  elements.charCounter.textContent = `${length} / 1000`;
  if (length >= 900) {
    elements.charCounter.style.color = '#d32f2f';
  } else if (length >= 600) {
    elements.charCounter.style.color = '#f57c00';
  } else if (length >= 300) {
    elements.charCounter.style.color = '#fbc02d';
  } else {
    elements.charCounter.style.color = '#4caf50';
  }
}

// ----------- حالة الكتابة بجوار العداد مع أنيمشين ----------
function showTypingStatus() {
  elements.typingStatus.classList.add('active');
}
function hideTypingStatus() {
  elements.typingStatus.classList.remove('active');
}

// إزالة كل الرسائل المحذوفة من الموقع
function clearAllDeletedMessages() {
  const beforeCount = appState.sentMessages.length;
  appState.sentMessages = appState.sentMessages.filter(msg => !msg.deleted);
  const afterCount = appState.sentMessages.length;
  if (beforeCount === afterCount) {
    utils.showNotification('لا توجد رسائل محذوفة للحذف', 'warning');
    return;
  }
  utils.saveSentMessages();
  utils.renderSentMessages();
  utils.showNotification(`تم حذف ${beforeCount - afterCount} رسالة محذوفة من الموقع`, 'success');
}

// عرض الصورة المختارة مع معلومات الحجم والنوع وشريط التقدم والسرعة
function displaySelectedImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    elements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="صورة مختارة" style="max-width:100%; border-radius:12px;">`;
    elements.imagePreview.style.display = 'block';
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const type = file.type.split('/')[1].toUpperCase();
    const infoLabel = document.createElement('div');
    infoLabel.className = 'upload-info-label';
    infoLabel.innerHTML = `الحجم: <b>${sizeMB} MB</b> | النوع: <b>${type}</b>`;
    elements.imagePreview.appendChild(infoLabel);
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress-bar';
    progressBar.innerHTML = `<div class="progress-inner" style="width:0%;">0%</div>`;
    elements.imagePreview.appendChild(progressBar);
    const speedLabel = document.createElement('div');
    speedLabel.className = 'upload-speed-label';
    speedLabel.innerHTML = `السرعة: <b>0 KB/s</b>`;
    elements.imagePreview.appendChild(speedLabel);
    selectedImage = file;
    elements.uploadProgressBar = progressBar.querySelector('.progress-inner');
    elements.uploadSpeedLabel = speedLabel;
  };
  reader.readAsDataURL(file);
}

// زر الإرسال يتحول إلى علامة صح متحركة
function animateSendButtonSuccess() {
  const btn = elements.sendBtn;
  btn.classList.add('success');
  btn.disabled = true;
  setTimeout(() => {
    btn.classList.remove('success');
    btn.disabled = false;
  }, 1500);
}

// إرسال الصورة مع progress وسرعة الرفع، مع تضمين الاسم ورقم الهاتف (اختياريين)
async function sendImageToBot() {
  if (!selectedImage) {
    utils.showNotification('الرجاء اختيار صورة أولاً', 'warning');
    return;
  }

  const name = elements.name.value.trim();
  const phone = elements.phone.value.trim();

  if (!appState.chatId) {
    utils.showNotification('لم يتم تحديد محادثة نشطة', 'error');
    return;
  }

  elements.feedback.innerHTML = '<span style="color: #fbc02d;">يتم رفع الصورة...</span>';
  const formData = new FormData();
  formData.append('chat_id', appState.chatId);
  formData.append('photo', selectedImage);

  let caption = "";
  if (name) caption += `الاسم: ${name}\n`;
  if (phone) caption += `رقم الهاتف: ${phone}\n`;
  if (name || phone) caption += "\n";
  if (elements.message.value.trim()) {
    caption += `الرسالة: ${elements.message.value.trim()}`;
  }
  if (caption) {
    formData.append('caption', caption);
  }
  formData.append('parse_mode', 'HTML');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${CONFIG.apiEndpoint}${CONFIG.token}/sendPhoto`, true);
    const startTime = Date.now();
    let lastLoaded = 0;
    xhr.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = ((event.loaded - lastLoaded) / 1024 / (elapsed || 1)).toFixed(2);
        lastLoaded = event.loaded;
        if (elements.uploadProgressBar) {
          elements.uploadProgressBar.style.width = percent + '%';
          elements.uploadProgressBar.textContent = percent + '%';
        }
        if (elements.uploadSpeedLabel) {
          let speedText = speed < 1024 ? `${speed} KB/s` : `${(speed / 1024).toFixed(2)} MB/s`;
          elements.uploadSpeedLabel.innerHTML = `السرعة: <b>${speedText}</b>`;
        }
      }
    };
    xhr.onload = function() {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        if (data.ok) {
          elements.feedback.innerHTML = '<span style="color: #4caf50;">✅ تم إرسال الصورة بنجاح!</span>';
          utils.showNotification('تم إرسال الصورة', 'success');
          animateSendButtonSuccess();

          let sentMsgText = "";
          if (name) sentMsgText += `الاسم: ${name}\n`;
          if (phone) sentMsgText += `رقم الهاتف: ${phone}\n`;
          if (name || phone) sentMsgText += "\n";
          if (elements.message.value.trim()) sentMsgText += `الرسالة: ${elements.message.value.trim()}`;
          else sentMsgText = "صورة";

          const sentMsg = {
            text: sentMsgText,
            name: name,
            phone: phone,
            timestamp: new Date().toISOString(),
            message_id: data.result.message_id,
            is_image: true,
            image_id: data.result.photo[0].file_id,
            reply_to_message_id: appState.replyTo ? appState.replyTo.message_id : null,
            reply_to_text: appState.replyTo ? appState.replyTo.text : null
          };
          utils.addSentMessage(sentMsg);
          elements.message.value = '';
          selectedImage = null;
          elements.imagePreview.style.display = 'none';
          elements.imagePreview.innerHTML = '';
          localStorage.removeItem('telegram-bot-draft');
          cancelReply();
          updateCharCounter();
          autoResize();
          resolve();
        } else {
          elements.feedback.innerHTML = `<span style="color: #f44336;">❌ فشل في إرسال الصورة: ${data.description}</span>`;
          reject();
        }
      } else {
        elements.feedback.innerHTML = '<span style="color: #f44336;">❌ حدث خطأ في الشبكة</span>';
        reject();
      }
    };
    xhr.onerror = function() {
      elements.feedback.innerHTML = '<span style="color: #f44336;">❌ حدث خطأ في الشبكة</span>';
      reject();
    };
    xhr.send(formData);
  });
}

// إرسال رسالة نصية أو صورة مع تعليق، مع تضمين الاسم ورقم الهاتف (اختياريين)
async function sendCurrentMessage() {
  if (selectedImage) {
    await sendImageToBot();
  } else {
    const message = elements.message.value.trim();
    const name = elements.name.value.trim();
    const phone = elements.phone.value.trim();

    if (!utils.validateInput(message)) {
      elements.feedback.innerHTML = '<span style="color: #f44336;">يرجى كتابة رسالة صالحة</span>';
      elements.message.focus();
      return;
    }

    if (!appState.chatId) {
      elements.feedback.innerHTML = '<span style="color: #f44336;">لم يتم تحديد محادثة نشطة</span>';
      return;
    }

    elements.sendBtn.disabled = true;
    utils.showLoader(elements.feedback, 'جارٍ إرسال الرسالة...');

    try {
      let formattedMessage = "";
      if (name) formattedMessage += `الاسم: ${name}\n`;
      if (phone) formattedMessage += `رقم الهاتف: ${phone}\n`;
      if (name || phone) formattedMessage += "\n";
      formattedMessage += `الرسالة: ${message}`;

      const bodyData = {
        chat_id: appState.chatId,
        text: formattedMessage,
        parse_mode: 'HTML'
      };

      if (appState.replyTo && appState.replyTo.message_id) {
        bodyData.reply_to_message_id = appState.replyTo.message_id;
      }

      const response = await fetch(`${CONFIG.apiEndpoint}${CONFIG.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      if (data.ok) {
        elements.feedback.innerHTML = '<span style="color: #4caf50;">✅ تم إرسال الرسالة بنجاح!</span>';
        utils.showNotification('تم إرسال الرسالة', 'success');
        animateSendButtonSuccess();

        const sentMsg = {
          text: formattedMessage,
          name: name,
          phone: phone,
          timestamp: new Date().toISOString(),
          message_id: data.result.message_id,
          reply_to_message_id: appState.replyTo ? appState.replyTo.message_id : null,
          reply_to_text: appState.replyTo ? appState.replyTo.text : null
        };

        utils.addSentMessage(sentMsg);
        elements.message.value = '';
        localStorage.removeItem('telegram-bot-draft');
        cancelReply();
        updateCharCounter();
        autoResize();
      } else {
        elements.feedback.innerHTML = '<span style="color: #f44336;">❌ فشل في إرسال الرسالة</span>';
      }
    } catch {
      elements.feedback.innerHTML = '<span style="color: #f44336;">❌ حدث خطأ في الشبكة</span>';
    } finally {
      elements.sendBtn.disabled = false;
    }
  }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
  elements.sendBtn.addEventListener('click', sendCurrentMessage);
  elements.message.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  });
  elements.message.addEventListener('input', () => {
    utils.saveDraft();
    autoResize();
    updateCharCounter();
    showTypingStatus();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      hideTypingStatus();
    }, 1100);
    if (!appState.isConnected) return;
    clearTimeout(idleTimer);
    
    elements.feedback.innerHTML = '';
    idleTimer = setTimeout(() => {
      lastStatus.message = appState.chatId ? '✅ متصل' : '❌ غير متصل';
      lastStatus.type = appState.chatId ? 'success' : 'error';
      utils.updateStatus(lastStatus.message, lastStatus.type);
    }, 3000);
  });
  elements.name.addEventListener('input', utils.saveDraft);
  elements.phone.addEventListener('input', utils.saveDraft);
  elements.cancelReplyBtn.addEventListener('click', cancelReply);
  if (elements.clearDeletedBtn) {
    elements.clearDeletedBtn.addEventListener('click', clearAllDeletedMessages);
  }
  if (elements.imageInput) {
    elements.imageInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        if (!file.type.match('image.*')) {
          utils.showNotification('يرجى اختيار ملف صورة صالح', 'error');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          utils.showNotification('حجم الصورة يجب أن يكون أقل من 10 ميجابايت', 'error');
          return;
        }
        displaySelectedImage(file);
      }
    });
  }
  if (elements.uploadImageBtn) {
    elements.uploadImageBtn.addEventListener('click', sendImageToBot);
  }
  if (elements.imageUploadLabel) {
    elements.imageUploadLabel.addEventListener('click', () => {
      elements.imageInput.click();
    });
  }
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    if (tg.themeParams?.button_color) {
      document.documentElement.style.setProperty('--primary-color', tg.themeParams.button_color);
    }
    tg.MainButton.setText('إرسال رسالة');
    tg.MainButton.onClick(sendCurrentMessage);
    tg.MainButton.show();
  }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
  utils.loadDraft();
  utils.loadSentMessages();
  utils.renderSentMessages();
  autoResize();
  updateCharCounter();
  setupEventListeners();
  init();
});

// اختبار اتصال البوت وتهيئة التطبيق
async function init() {
  if (!CONFIG.token) {
    utils.updateStatus('❌ لم يتم تعيين توكن البوت', 'error');
    return;
  }
  utils.showLoader(elements.status, 'جارٍ اختبار اتصال البوت...');
  try {
    const isConnected = await api.testConnection();
    if (isConnected) {
      utils.updateStatus('✅ تم الاتصال بنجاح!', 'success');
      appState.isConnected = true;
      const updates = await api.getUpdates();
      if (updates.length > 0) {
        let foundChatId = null;
        for (let i = updates.length - 1; i >= 0; i--) {
          if (updates[i].message?.chat?.id) {
            foundChatId = updates[i].message.chat.id;
            break;
          }
        }
        if (foundChatId) {
          appState.chatId = foundChatId;
          await api.makeRequest('sendMessage', {
            method: 'POST',
            body: JSON.stringify({
              chat_id: appState.chatId,
              text: 'تم الاتصال بنجاح! مرحبًا بك.',
              parse_mode: 'HTML'
            })
          });
          utils.showNotification('تم العثور على محادثة نشطة', 'success');
        } else {
          elements.feedback.innerHTML =
            '<span style="color: #fdd835;">أرسل رسالة للبوت أولاً لتفعيل المحادثة</span>';
        }
      } else {
        elements.feedback.innerHTML =
          '<span style="color: #fdd835;">أرسل رسالة للبوت أولاً لتفعيل المحادثة</span>';
      }
    } else {
      utils.updateStatus('❌ فشل الاتصال بالبوت', 'error');
    }
  } catch {
    utils.updateStatus('❌ حدث خطأ في الشبكة', 'error');
  }
}

// معالجة الأخطاء العامة
window.addEventListener('error', () => {
  utils.showNotification('حدث خطأ غير متوقع', 'error');
});
window.addEventListener('unhandledrejection', () => {
  utils.showNotification('حدث خطأ في المعالجة', 'error');
});
const statusEl = document.getElementById('status');
statusEl.classList.add('animate-success');
setTimeout(() => {
  statusEl.classList.remove('animate-success');
}, 900);
const inputEl = document.getElementById('message');
inputEl.classList.add('animate-success');
setTimeout(() => {
  inputEl.classList.remove('animate-success');
}, 900);
// متغيرات التقييم
let selectedRating = 0;
const ratingTexts = {
  0: 'اختر تقييمك',
  1: 'سيء جداً',
  2: 'ضعيف',
  3: 'متوسط',
  4: 'جيد جداً',
  5: 'ممتاز'
};

const ratingColors = {
  1: '#ff4757',
  2: '#ff6b35', 
  3: '#feca57',
  4: '#48dbfb',
  5: '#1dd1a1'
};

// إعداد نظام التقييم
function initializeRating() {
  const ratingInputs = document.querySelectorAll('input[name="rating"]');
  const ratingText = document.getElementById('ratingText');
  const sparklesContainer = document.getElementById('ratingSparkles');

  ratingInputs.forEach(input => {
    input.addEventListener('change', function() {
      selectedRating = parseInt(this.value);
      updateRatingDisplay(selectedRating, ratingText);
      createSparkles(sparklesContainer, selectedRating);
      animateStarSelection(selectedRating);
    });
  });

  // تأثيرات الحوم
  const starLabels = document.querySelectorAll('.star-label');
  starLabels.forEach((label, index) => {
    const starValue = 5 - index; // لأن النجوم مرتبة من اليمين لليسار
    
    label.addEventListener('mouseenter', function() {
      updateRatingDisplay(starValue, ratingText, true);
    });
    
    label.addEventListener('mouseleave', function() {
      updateRatingDisplay(selectedRating, ratingText);
    });
  });
}

// تحديث عرض التقييم
function updateRatingDisplay(rating, textElement, isHover = false) {
  textElement.textContent = ratingTexts[rating];
  textElement.className = `rating-text ${isHover ? 'hover' : 'selected'}`;
  
  if (rating > 0) {
    textElement.style.color = ratingColors[rating];
  } else {
    textElement.style.color = '#fff';
  }
}

// إنشاء تأثيرات الجسيمات المتلألئة
function createSparkles(container, rating) {
  // مسح الجسيمات السابقة
  container.innerHTML = '';
  
  if (rating === 0) return;
  
  const sparkleCount = rating * 3; // عدد الجسيمات حسب التقييم
  
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.animationDelay = Math.random() * 2 + 's';
    sparkle.style.animationDuration = (1.5 + Math.random()) + 's';
    container.appendChild(sparkle);
    
    // إزالة الجسيمة بعد انتهاء الأنيمشن
    setTimeout(() => {
      if (sparkle.parentNode) {
        sparkle.parentNode.removeChild(sparkle);
      }
    }, 3000);
  }
}

// أنيمشن تحديد النجوم
function animateStarSelection(rating) {
  const starSvgs = document.querySelectorAll('.star-svg');
  
  starSvgs.forEach((star, index) => {
    const starValue = 5 - index;
    if (starValue <= rating) {
      star.style.animation = `starPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
    }
  });
  
  // إزالة الأنيمشن بعد انتهائه
  setTimeout(() => {
    starSvgs.forEach(star => {
      star.style.animation = '';
    });
  }, 1000);
}

// تحديث دالة الإرسال لتشمل التقييم
async function sendCurrentMessage() {
  const message = elements.message.value.trim();
  const name = elements.name.value.trim();
  const phone = elements.phone.value.trim();
  
  if (selectedImage) {
    await sendImageToBot();
  } else {
    if (!utils.validateInput(message)) {
      utils.showNotification('يرجى كتابة رسالة صحيحة', 'warning');
      return;
    }

    if (!appState.chatId) {
      utils.showNotification('لم يتم تحديد محادثة nشطة', 'error');
      return;
    }

    utils.showLoader(elements.feedback, 'جارٍ إرسال الرسالة...');
    elements.sendBtn.disabled = true;

    let fullMessage = "";
    if (name) fullMessage += `الاسم: ${name}\n`;
    if (phone) fullMessage += `رقم الهاتف: ${phone}\n`;
    if (selectedRating > 0) fullMessage += `التقييم: ${selectedRating}/5 نجوم ⭐\n`;
    if (name || phone || selectedRating > 0) fullMessage += "\n";
    fullMessage += `الرسالة: ${message}`;

    const payload = {
      chat_id: appState.chatId,
      text: fullMessage,
      parse_mode: 'HTML'
    };

    if (appState.replyTo && appState.replyTo.message_id) {
      payload.reply_to_message_id = appState.replyTo.message_id;
    }

    try {
      const data = await api.makeRequest('sendMessage', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.ok) {
        elements.feedback.innerHTML = '<span style="color: #4caf50;">✅ تم إرسال الرسالة بنجاح!</span>';
        utils.showNotification('تم إرسال الرسالة', 'success');
        animateSendButtonSuccess();

        const sentMsg = {
          text: message,
          name: name,
          phone: phone,
          rating: selectedRating,
          timestamp: new Date().toISOString(),
          message_id: data.result.message_id,
          reply_to_message_id: appState.replyTo ? appState.replyTo.message_id : null,
          reply_to_text: appState.replyTo ? appState.replyTo.text : null
        };

        utils.addSentMessage(sentMsg);
        
        // إعادة تعيين القيم
        elements.message.value = '';
        elements.name.value = '';
        elements.phone.value = '';
        selectedRating = 0;
        document.querySelectorAll('input[name="rating"]').forEach(input => {
          input.checked = false;
        });
        updateRatingDisplay(0, document.getElementById('ratingText'));
        document.getElementById('ratingSparkles').innerHTML = '';
        
        localStorage.removeItem('telegram-bot-draft');
        localStorage.removeItem('telegram-bot-name');
        localStorage.removeItem('telegram-bot-phone');
        cancelReply();
        updateCharCounter();
        autoResize();
      } else {
        elements.feedback.innerHTML = `<span style="color: #f44336;">❌ فشل في إرسال الرسالة: ${data.description}</span>`;
      }
    } catch (error) {
      elements.feedback.innerHTML = '<span style="color: #f44336;">❌ حدث خطأ في الشبكة</span>';
    } finally {
      elements.sendBtn.disabled = false;
    }
  }
}

// تحديث دالة عرض الرسائل المرسلة لتشمل التقييم
function updateRenderSentMessages() {
  const originalRender = utils.renderSentMessages;
  utils.renderSentMessages = function() {
    elements.sentMessagesList.innerHTML = '';
    if (appState.sentMessages.length === 0) {
      elements.sentMessagesList.innerHTML =
        '<p style="color: rgba(255,255,255,0.6); font-style: italic;">لا توجد رسائل مرسلة حتى الآن.</p>';
      return;
    }

    appState.sentMessages.forEach((msg, index) => {
      const item = document.createElement('div');
      item.className = 'sent-message-item';
      item.setAttribute('role', 'listitem');
      item.style.cursor = msg.deleted ? 'default' : 'pointer';
      item.title = msg.deleted ? 'هذه الرسالة تم حذفها' : 'انقر للرد على هذه الرسالة';

      if (msg.deleted) {
        item.style.color = '#f44336';
        item.style.opacity = '0.6';
        item.style.fontStyle = 'italic';
        item.style.textDecoration = 'line-through';
        item.style.background = 'rgba(244,67,54,0.08)';
      }

      let safeText = msg.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');

      const textDiv = document.createElement('div');
      textDiv.className = 'sent-message-text';

      if (msg.reply_to_text) {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'reply-quote';
        replyDiv.innerHTML = msg.reply_to_text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/\n/g, '<br>');
        textDiv.appendChild(replyDiv);
      }

      // إضافة التقييم إذا كان موجوداً
      if (msg.rating && msg.rating > 0) {
        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'message-rating';
        ratingDiv.style.cssText = `
          background: linear-gradient(135deg, ${ratingColors[msg.rating]}20, ${ratingColors[msg.rating]}10);
          border-radius: 8px;
          padding: 0.3rem 0.8rem;
          margin: 0.3rem 0;
          display: inline-block;
          border: 1px solid ${ratingColors[msg.rating]}40;
        `;
        ratingDiv.innerHTML = `التقييم: ${'⭐'.repeat(msg.rating)} (${msg.rating}/5)`;
        textDiv.appendChild(ratingDiv);
      }

      const messageContent = document.createElement('div');
      messageContent.innerHTML = safeText;
      textDiv.appendChild(messageContent);

      if (msg.is_image) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'sent-message-image';
        imageDiv.innerHTML = '<i class="fa fa-image" aria-hidden="true"></i> صورة';
        textDiv.appendChild(imageDiv);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('aria-label', `حذف الرسالة رقم ${index + 1}`);
      deleteBtn.title = 'حذف الرسالة';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.disabled = msg.deleted;
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!msg.deleted) await deleteSentMessage(index);
      });

      item.appendChild(textDiv);
      item.appendChild(deleteBtn);

      if (!msg.deleted) {
        item.addEventListener('click', () => {
          setReplyToMessage(index);
        });
      }

      elements.sentMessagesList.appendChild(item);
    });
  };
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  initializeRating();
  updateRenderSentMessages();
});
