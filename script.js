// ============================================
// نظام إدارة مدربين أكاديمية هاير للابتكار
// النسخة 2.3 - مع نظام صلاحيات متقدم
// ============================================

// بيانات المدربين والكورسات
let trainers = [];
let courses = [];

// إعدادات Supabase
const SUPABASE_URL = 'https://oqkizzsutcskqmtxidsd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xa2l6enN1dGNza3FtdHhpZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NzE3MDgsImV4cCI6MjA4MTM0NzcwOH0.3iDKaDEEvk0ZkNnw5qSgZ2YKsSjAaDECnqGZYdxXKmI';

// إعدادات الحماية
let PASSWORD = 'admin123'; // كلمة المرور الافتراضية
const MAX_ATTEMPTS = 3; // الحد الأقصى للمحاولات
const LOCK_TIME = 60000; // 60 ثانية تأخير بعد تجاوز المحاولات

// صلاحيات النظام - الإعدادات الافتراضية
let permissions = {
  add_trainer: true,      // يتطلب كلمة مرور لإضافة مدرب
  edit_trainer: true,     // يتطلب كلمة مرور لتعديل مدرب
  delete_trainer: true,   // يتطلب كلمة مرور لحذف مدرب
  add_course: true,       // يتطلب كلمة مرور لإضافة كورس
  edit_course: true,      // يتطلب كلمة مرور لتعديل كورس
  delete_course: true,    // يتطلب كلمة مرور لحذف كورس
  delete_all_trainers: true, // يتطلب كلمة مرور لحذف جميع المدربين
  delete_all_courses: true,  // يتطلب كلمة مرور لحذف جميع الكورسات
  import_data: true,      // يتطلب كلمة مرور لاستيراد بيانات
  export_data: true,      // يتطلب كلمة مرور لتصدير بيانات
  backup: true,           // يتطلب كلمة مرور للنسخ الاحتياطي
  restore: true,          // يتطلب كلمة مرور للاستعادة
  change_password: true,  // يتطلب كلمة مرور لتغيير كلمة المرور
  manage_permissions: true // يتطلب كلمة مرور لإدارة الصلاحيات
};

const PERMISSIONS_KEY = 'haier_permissions';

// حالة الحماية
let failedAttempts = 0;
let isLocked = false;
let lockUntil = 0;

// المتغيرات العامة للمدربين
let currentPage = 1;
const trainersPerPage = 8;
let filteredTrainers = [];
let isEditing = false;
let currentEditId = null;
let deleteCandidateId = null;

// المتغيرات العامة للكورسات
let filteredCourses = [];
let currentCoursePage = 1;
const coursesPerPage = 8;
let deleteCourseCandidateId = null;

// ثوابت التخزين
const STORAGE_KEY = 'haier_academy_trainers_v2';
const COURSES_KEY = 'haier_academy_courses_v2';
const BACKUP_KEY = 'haier_academy_backup';
const SECURITY_KEY = 'haier_security_settings';
const PASSWORD_KEY = 'haier_password';

// ============================================
// البداية - عندما تحمل الصفحة
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 نظام إدارة مدربين أكاديمية هاير للابتكار - الإصدار 2.3");
    
    // تعيين السنة الحالية في التذييل
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // تحميل إعدادات الحماية وكلمة المرور
    loadSecuritySettings();
    loadPasswordFromStorage();
    
    // تحميل الصلاحيات
    loadPermissions();
    
    // التحقق من حالة القفل
    checkLockStatus();
    
    // تهيئة Supabase
    await initSupabase();
    
    // تحميل البيانات من قاعدة البيانات
    await loadDataFromDatabase();
    
    // 🔥 🔥 🔥 هذا هو الإصلاح الرئيسي! 🔥 🔥 🔥
    // تأكد من عرض البيانات مباشرة بعد تحميلها
    if (trainers.length === 0) {
        console.log("📝 لا توجد بيانات، سيتم إنشاء بيانات تجريبية...");
        await initializeSampleData();
    }
    
    // عرض البيانات مباشرة
    renderTrainers();
    renderCourses();
    updateStats();
    updateStorageStatus();
    setupEventListeners();
    
    // إعداد التنقل بين الأقسام
    setupNavigation();
    
    // إظهار رسالة ترحيب
    setTimeout(() => {
        showNotification('مرحباً بك في نظام إدارة مدربين أكاديمية هاير للابتكار!', 'info');
    }, 2000);
});

// ============================================
// إدارة الصلاحيات
// ============================================

// تحميل الصلاحيات من التخزين المحلي
function loadPermissions() {
    try {
        const savedPermissions = localStorage.getItem(PERMISSIONS_KEY);
        if (savedPermissions) {
            permissions = JSON.parse(savedPermissions);
            console.log('✅ تم تحميل الصلاحيات من التخزين المحلي');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الصلاحيات:', error);
    }
}

// حفظ الصلاحيات في التخزين المحلي
function savePermissions() {
    try {
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
        console.log('💾 تم حفظ الصلاحيات في التخزين المحلي');
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ الصلاحيات:', error);
        return false;
    }
}

// عرض نموذج إدارة الصلاحيات (محمي بكلمة مرور)
function showPermissionsModal() {
    requirePassword('manage_permissions', function() {
        openPermissionsModal();
    });
}

// فتح نموذج إدارة الصلاحيات (داخلي)
function openPermissionsModal() {
    const modalId = 'permissionsModal_' + Date.now();
    
    let permissionsHTML = '';
    
    // إنشاء قائمة بالصلاحيات
    const permissionLabels = {
        'add_trainer': 'إضافة مدرب جديد',
        'edit_trainer': 'تعديل بيانات المدرب',
        'delete_trainer': 'حذف مدرب',
        'add_course': 'إضافة كورس جديد',
        'edit_course': 'تعديل كورس',
        'delete_course': 'حذف كورس',
        'delete_all_trainers': 'حذف جميع المدربين',
        'delete_all_courses': 'حذف جميع الكورسات',
        'import_data': 'استيراد البيانات',
        'export_data': 'تصدير البيانات',
        'backup': 'إنشاء نسخة احتياطية',
        'restore': 'استعادة النسخة الاحتياطية',
        'change_password': 'تغيير كلمة المرور',
        'manage_permissions': 'إدارة الصلاحيات'
    };
    
    // بناء واجهة الصلاحيات
    permissionsHTML += '<div class="permissions-list">';
    
    Object.keys(permissions).forEach(key => {
        const isEnabled = permissions[key];
        permissionsHTML += `
            <div class="permission-item">
                <div class="permission-info">
                    <h4>${permissionLabels[key] || key}</h4>
                    <p>${isEnabled ? 'يتطلب كلمة مرور' : 'لا يتطلب كلمة مرور'}</p>
                </div>
                <label class="permission-switch">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} data-permission="${key}">
                    <span class="permission-slider"></span>
                </label>
            </div>
        `;
    });
    
    permissionsHTML += '</div>';
    
    const modalHTML = `
        <div class="modal" id="${modalId}" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-shield"></i> إدارة الصلاحيات</h3>
                    <button class="modal-close" id="closePermissions_${modalId}" aria-label="إغلاق النافذة">&times;</button>
                </div>
                <div style="padding: 30px;">
                    <div class="permissions-header">
                        <h4><i class="fas fa-info-circle"></i> تعليمات:</h4>
                        <p>يمكنك تفعيل أو تعطيل الحاجة لكلمة المرور لكل إجراء على حدة. عند تعطيل الحاجة لكلمة مرور، يمكن تنفيذ الإجراء مباشرة دون طلب كلمة المرور.</p>
                        <p style="color: var(--primary-color); font-weight: bold; margin-top: 10px;">
                            <i class="fas fa-shield-alt"></i> إدارة الصلاحيات نفسها تتطلب كلمة مرور للوصول إليها.
                        </p>
                    </div>
                    
                    ${permissionsHTML}
                    
                    <div class="permissions-actions" style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                        <button class="btn-cancel" id="cancelPermissions_${modalId}">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                        <button class="btn-submit" id="savePermissions_${modalId}">
                            <i class="fas fa-save"></i> حفظ التغييرات
                        </button>
                        <button class="btn-reset" id="resetPermissions_${modalId}">
                            <i class="fas fa-redo"></i> إعادة تعيين
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إضافة النموذج إلى الجسم
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
    
    // إضافة مستمعي الأحداث
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(`closePermissions_${modalId}`);
    const cancelBtn = document.getElementById(`cancelPermissions_${modalId}`);
    const saveBtn = document.getElementById(`savePermissions_${modalId}`);
    const resetBtn = document.getElementById(`resetPermissions_${modalId}`);
    
    // إغلاق النموذج
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // حفظ الصلاحيات
    saveBtn.addEventListener('click', () => {
        // تحديث الصلاحيات من عناصر الإدخال
        const permissionInputs = modal.querySelectorAll('input[data-permission]');
        permissionInputs.forEach(input => {
            const permissionName = input.getAttribute('data-permission');
            permissions[permissionName] = input.checked;
        });
        
        // حفظ الصلاحيات
        savePermissions();
        
        // إغلاق النافذة
        modal.remove();
        
        // إظهار رسالة نجاح
        showNotification('تم حفظ إعدادات الصلاحيات بنجاح!', 'success');
    });
    
    // إعادة تعيين الصلاحيات
    resetBtn.addEventListener('click', () => {
        if (confirm('هل تريد إعادة تعيين جميع الصلاحيات إلى الإعدادات الافتراضية؟')) {
            // الإعدادات الافتراضية (جميعها تتطلب كلمة مرور)
            Object.keys(permissions).forEach(key => {
                permissions[key] = true;
            });
            
            // تحديث الواجهة
            const permissionInputs = modal.querySelectorAll('input[data-permission]');
            permissionInputs.forEach(input => {
                input.checked = true;
            });
            
            showNotification('تم إعادة تعيين الصلاحيات إلى الإعدادات الافتراضية', 'info');
        }
    });
    
    // إغلاق النموذج بالضغط خارجيه
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
}

// ============================================
// إعداد التنقل بين الأقسام
// ============================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // إزالة التظليل من جميع الروابط
            navLinks.forEach(l => l.classList.remove('active'));
            
            // إضافة التظليل للرابط المحدد
            this.classList.add('active');
            
            // إذا كان الرابط يشير إلى قسم معين، نقوم بالتمرير إليه
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
    
    // إضافة مستمعي الأحداث للتمرير عند التمرير في الصفحة
    window.addEventListener('scroll', updateActiveNavLink);
    
    // تحديث الرابط النشط عند التحميل
    updateActiveNavLink();
}

// تحديث الرابط النشط بناءً على الموقع الحالي
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let currentSectionId = '';
    
    // تحديد القسم الحالي
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSectionId = section.id;
        }
    });
    
    // إزالة التظليل من جميع الروابط
    navLinks.forEach(link => link.classList.remove('active'));
    
    // إضافة التظليل للرابط المناسب
    if (currentSectionId) {
        const activeLink = document.querySelector(`.nav-links a[href="#${currentSectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        } else {
            // إذا كنا في الهيدر، نضيف التظليل للرئيسية
            if (window.scrollY < 500) {
                document.querySelector('.nav-links a[href="#home"]').classList.add('active');
            }
        }
    } else {
        // إذا لم نكن في أي قسم، نعود للرئيسية
        document.querySelector('.nav-links a[href="#home"]').classList.add('active');
    }
}

// ============================================
// تهيئة البيانات التجريبية
// ============================================

async function initializeSampleData() {
    console.log("➕ إنشاء بيانات تجريبية...");
    
    // بيانات مدربين تجريبية
    const sampleTrainers = [
        {
            name: "أحمد محمد علي",
            phone: "01012345678",
            email: "ahmed@example.com",
            nationality: "مصري",
            gender: "ذكر",
            qualification: "ماجستير",
            specialization: "تكنولوجيا المعلومات",
            details: "مدرب محترف في برمجة الويب ولديه خبرة 10 سنوات في تطوير التطبيقات والمواقع الإلكترونية. حاصل على شهادات متقدمة في تطوير الويب.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name: "سارة خالد أحمد",
            phone: "01123456789",
            email: "sara@example.com",
            nationality: "سعودي",
            gender: "أنثى",
            qualification: "دكتوراه",
            specialization: "إدارة الأعمال",
            details: "أستاذة في الإدارة والإقتصاد ولها العديد من الأبحاث المنشورة في مجلات عالمية. متخصصة في إدارة المشاريع والتخطيط الاستراتيجي.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name: "محمد علي حسن",
            phone: "01234567890",
            email: "mohamed@example.com",
            nationality: "أردني",
            gender: "ذكر",
            qualification: "بكالوريوس",
            specialization: "الهندسة",
            details: "مهندس مدني متخصص في المشاريع الكبرى والبنية التحتية. لديه خبرة في إدارة فرق العمل وتنفيذ المشاريع الإنشائية.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name: "فاطمة عمر إبراهيم",
            phone: "01567891234",
            email: "fatema@example.com",
            nationality: "إماراتي",
            gender: "أنثى",
            qualification: "دبلوم",
            specialization: "اللغات",
            details: "معلمة لغة إنجليزية ولها خبرة في الترجمة الفورية والتحرير اللغوي. متخصصة في تعليم اللغة الإنجليزية للأعمال.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name: "خالد سعيد محمود",
            phone: "01098765432",
            email: "khaled@example.com",
            nationality: "قطري",
            gender: "ذكر",
            qualification: "دكتوراه",
            specialization: "الطب",
            details: "طبيب استشاري متخصص في الجراحة العامة. لديه خبرة واسعة في المستشفيات التعليمية والبحث العلمي الطبي.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name: "نورا عبدالله سالم",
            phone: "01187654321",
            email: "noura@example.com",
            nationality: "كويتي",
            gender: "أنثى",
            qualification: "ماجستير",
            specialization: "التسويق",
            details: "خبيرة تسويق رقمي معتمدة. متخصصة في التسويق عبر وسائل التواصل الاجتماعي وتحليل البيانات التسويقية.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
    
    // بيانات كورسات تجريبية
    const sampleCourses = [
        {
            name_ar: "برمجة الويب المتقدمة",
            name_en: "Advanced Web Programming",
            sub_specialization: "تطوير الويب",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name_ar: "إدارة المشاريع الاحترافية",
            name_en: "Professional Project Management",
            sub_specialization: "إدارة المشاريع",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name_ar: "تعلم اللغة الإنجليزية للأعمال",
            name_en: "Business English Learning",
            sub_specialization: "اللغة الإنجليزية",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name_ar: "تحليل البيانات باستخدام Python",
            name_en: "Data Analysis with Python",
            sub_specialization: "علوم البيانات",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name_ar: "التسويق الرقمي المتكامل",
            name_en: "Integrated Digital Marketing",
            sub_specialization: "التسويق الرقمي",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            name_ar: "أساسيات التصميم الجرافيكي",
            name_en: "Graphic Design Fundamentals",
            sub_specialization: "التصميم الجرافيكي",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
    
    try {
        // حفظ المدربين في قاعدة البيانات
        for (const trainer of sampleTrainers) {
            const savedTrainer = await saveTrainerToDatabase(trainer);
            trainers.push(savedTrainer);
        }
        
        // حفظ الكورسات في قاعدة البيانات
        for (const course of sampleCourses) {
            const savedCourse = await saveCourseToDatabase(course);
            courses.push(savedCourse);
        }
        
        filteredTrainers = [...trainers];
        filteredCourses = [...courses];
        
        console.log(`✅ تم إنشاء ${trainers.length} مدرب تجريبي`);
        console.log(`✅ تم إنشاء ${courses.length} كورس تجريبي`);
        
        // حفظ محلياً
        saveTrainersToStorage();
        saveCoursesToStorage();
        
        return true;
        
    } catch (error) {
        console.error("❌ خطأ في إنشاء البيانات التجريبية:", error);
        
        // استخدام البيانات محلياً إذا فشل الاتصال بقاعدة البيانات
        trainers = sampleTrainers.map((trainer, index) => ({
            ...trainer,
            id: 1000 + index
        }));
        
        courses = sampleCourses.map((course, index) => ({
            ...course,
            id: 2000 + index
        }));
        
        filteredTrainers = [...trainers];
        filteredCourses = [...courses];
        
        saveTrainersToStorage();
        saveCoursesToStorage();
        
        return false;
    }
}

// ============================================
// نظام الحماية والمصادقة
// ============================================

// تحميل إعدادات الحماية
function loadSecuritySettings() {
    try {
        const settings = localStorage.getItem(SECURITY_KEY);
        if (settings) {
            const parsed = JSON.parse(settings);
            failedAttempts = parsed.failedAttempts || 0;
            isLocked = parsed.isLocked || false;
            lockUntil = parsed.lockUntil || 0;
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الحماية:', error);
    }
}

// تحميل كلمة المرور من التخزين المحلي
function loadPasswordFromStorage() {
    try {
        const savedPassword = localStorage.getItem(PASSWORD_KEY);
        if (savedPassword) {
            PASSWORD = savedPassword;
            console.log('✅ تم تحميل كلمة المرور من التخزين المحلي');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل كلمة المرور:', error);
    }
}

// حفظ كلمة المرور في التخزين المحلي
function savePasswordToStorage() {
    try {
        localStorage.setItem(PASSWORD_KEY, PASSWORD);
        console.log('💾 تم حفظ كلمة المرور في التخزين المحلي');
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ كلمة المرور:', error);
        return false;
    }
}

// حفظ إعدادات الحماية
function saveSecuritySettings() {
    try {
        const settings = {
            failedAttempts: failedAttempts,
            isLocked: isLocked,
            lockUntil: lockUntil,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('خطأ في حفظ إعدادات الحماية:', error);
    }
}

// التحقق من حالة القفل
function checkLockStatus() {
    if (isLocked) {
        const currentTime = Date.now();
        if (currentTime < lockUntil) {
            const remainingTime = Math.ceil((lockUntil - currentTime) / 1000);
            showNotification(`النظام مقفل! يرجى المحاولة بعد ${remainingTime} ثانية`, 'error');
            return true;
        } else {
            // انتهاء فترة القفل
            isLocked = false;
            failedAttempts = 0;
            saveSecuritySettings();
        }
    }
    return false;
}

// التحقق من الصلاحية قبل تنفيذ الإجراءات المحمية
function requirePassword(action, callback, data = null) {
    // التحقق من حالة القفل
    if (checkLockStatus()) {
        return;
    }
    
    // التحقق مما إذا كان هذا الإجراء يتطلب كلمة مرور
    if (permissions[action] === false) {
        // لا يتطلب كلمة مرور، تنفيذ الإجراء مباشرة
        console.log(`✅ الإجراء ${action} لا يتطلب كلمة مرور (معطل)`);
        if (callback) {
            if (data) {
                callback(data);
            } else {
                callback();
            }
        }
        return;
    }
    
    // إذا كان الإجراء يتطلب كلمة مرور، عرض نموذج كلمة المرور
    showPasswordModal(action, callback, data);
}

// عرض نموذج كلمة المرور
function showPasswordModal(action, callback, data = null) {
    // إنشاء معرف فريد للنموذج
    const modalId = 'passwordModal_' + Date.now();
    
    // تحديد نص الإجراء
    let actionText = '';
    switch (action) {
        case 'add_trainer':
            actionText = 'إضافة مدرب جديد';
            break;
        case 'edit_trainer':
            actionText = 'تعديل بيانات المدرب';
            break;
        case 'delete_trainer':
            actionText = 'حذف المدرب';
            break;
        case 'add_course':
            actionText = 'إضافة كورس جديد';
            break;
        case 'edit_course':
            actionText = 'تعديل الكورس';
            break;
        case 'delete_course':
            actionText = 'حذف الكورس';
            break;
        case 'delete_all_trainers':
            actionText = 'حذف جميع المدربين';
            break;
        case 'delete_all_courses':
            actionText = 'حذف جميع الكورسات';
            break;
        case 'import_data':
            actionText = 'استيراد البيانات';
            break;
        case 'export_data':
            actionText = 'تصدير البيانات';
            break;
        case 'backup':
            actionText = 'إنشاء نسخة احتياطية';
            break;
        case 'restore':
            actionText = 'استعادة النسخة الاحتياطية';
            break;
        case 'change_password':
            actionText = 'تغيير كلمة المرور';
            break;
        case 'manage_permissions':
            actionText = 'إدارة الصلاحيات';
            break;
        default:
            actionText = 'إجراء محمي';
    }
    
    const passwordHTML = `
        <div class="modal" id="${modalId}" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-shield-alt"></i> التحقق من الهوية</h3>
                    <button class="modal-close" id="closePassword_${modalId}" aria-label="إغلاق النافذة">&times;</button>
                </div>
                <form id="passwordForm_${modalId}" style="padding: 30px;">
                    <div class="form-group full-width">
                        <label for="passwordInput_${modalId}"><i class="fas fa-lock"></i> كلمة المرور المطلوبة</label>
                        <div style="background: rgba(var(--primary-color), 0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <p style="color: var(--primary-color); font-weight: 700; margin: 0;">
                                <i class="fas fa-exclamation-circle"></i> ${actionText}
                            </p>
                        </div>
                        <input type="password" id="passwordInput_${modalId}" required autocomplete="off" placeholder="أدخل كلمة المرور">
                        <small class="form-hint">أدخل كلمة المرور للموافقة على هذا الإجراء</small>
                        ${failedAttempts > 0 ? `
                            <div style="margin-top: 10px; color: var(--warning-color); font-size: 0.9rem;">
                                <i class="fas fa-exclamation-triangle"></i> محاولات فاشلة: ${failedAttempts}/${MAX_ATTEMPTS}
                            </div>
                        ` : ''}
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" id="cancelPassword_${modalId}">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                        <button type="submit" class="btn-submit">
                            <i class="fas fa-check"></i> تأكيد
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // إضافة النموذج إلى الجسم
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = passwordHTML;
    document.body.appendChild(modalDiv);
    
    // إضافة مستمعي الأحداث
    const form = document.getElementById(`passwordForm_${modalId}`);
    const cancelBtn = document.getElementById(`cancelPassword_${modalId}`);
    const closeBtn = document.getElementById(`closePassword_${modalId}`);
    const modal = document.getElementById(modalId);
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handlePasswordSubmit(modalId, action, callback, data);
    });
    
    cancelBtn.addEventListener('click', function() {
        modal.remove();
    });
    
    closeBtn.addEventListener('click', function() {
        modal.remove();
    });
    
    // إغلاق النموذج بالضغط خارجيه
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
    
    // التركيز على حقل كلمة المرور
    setTimeout(() => {
        document.getElementById(`passwordInput_${modalId}`).focus();
    }, 100);
}

// التعامل مع إرسال كلمة المرور
function handlePasswordSubmit(modalId, action, callback, data) {
    const passwordInput = document.getElementById(`passwordInput_${modalId}`);
    const password = passwordInput.value;
    
    if (!password) {
        showNotification('يرجى إدخال كلمة المرور', 'error');
        passwordInput.focus();
        return;
    }
    
    if (password === PASSWORD) {
        // كلمة المرور صحيحة
        failedAttempts = 0;
        saveSecuritySettings();
        
        // إغلاق النموذج
        const modal = document.getElementById(modalId);
        modal.remove();
        
        // تنفيذ الإجراء المطلوب
        if (callback) {
            if (data) {
                callback(data);
            } else {
                callback();
            }
        }
        
        // إظهار رسالة نجاح
        showNotification('تم التحقق من الهوية بنجاح', 'success');
        
    } else {
        // كلمة المرور خاطئة
        failedAttempts++;
        saveSecuritySettings();
        
        // التحقق من تجاوز الحد الأقصى للمحاولات
        if (failedAttempts >= MAX_ATTEMPTS) {
            // قفل النظام
            isLocked = true;
            lockUntil = Date.now() + LOCK_TIME;
            saveSecuritySettings();
            
            // إغلاق النموذج
            const modal = document.getElementById(modalId);
            modal.remove();
            
            // إظهار رسالة القفل
            const lockMinutes = Math.ceil(LOCK_TIME / 60000);
            showNotification(`تم تجاوز الحد الأقصى للمحاولات! النظام مقفل لمدة ${lockMinutes} دقيقة`, 'error');
            
        } else {
            // إظهار رسالة خطأ
            const remainingAttempts = MAX_ATTEMPTS - failedAttempts;
            showNotification(`كلمة المرور غير صحيحة! لديك ${remainingAttempts} محاولة${remainingAttempts > 1 ? 'ات' : ''}`, 'error');
            
            // اهتزاز حقل الإدخال
            passwordInput.style.animation = 'shake 0.5s';
            passwordInput.value = '';
            passwordInput.focus();
            
            setTimeout(() => {
                passwordInput.style.animation = '';
            }, 500);
        }
    }
}

// ============================================
// إدارة كلمة المرور
// ============================================

// فتح نموذج تغيير كلمة المرور
function openChangePasswordModal() {
    // التحقق من حالة القفل أولاً
    if (checkLockStatus()) {
        return;
    }
    
    const modalId = 'changePasswordModal_' + Date.now();
    
    const passwordHTML = `
        <div class="modal" id="${modalId}" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> تغيير كلمة المرور</h3>
                    <button class="modal-close" id="closeChangePassword_${modalId}" aria-label="إغلاق النافذة">&times;</button>
                </div>
                <form id="changePasswordForm_${modalId}" style="padding: 30px;">
                    <div class="form-group full-width">
                        <label for="currentPassword_${modalId}"><i class="fas fa-lock"></i> كلمة المرور الحالية</label>
                        <input type="password" id="currentPassword_${modalId}" required autocomplete="off" placeholder="أدخل كلمة المرور الحالية">
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="newPassword_${modalId}"><i class="fas fa-key"></i> كلمة المرور الجديدة</label>
                        <input type="password" id="newPassword_${modalId}" required autocomplete="off" placeholder="أدخل كلمة المرور الجديدة">
                        <small class="form-hint">يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل</small>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="confirmPassword_${modalId}"><i class="fas fa-check-circle"></i> تأكيد كلمة المرور الجديدة</label>
                        <input type="password" id="confirmPassword_${modalId}" required autocomplete="off" placeholder="أعد إدخال كلمة المرور الجديدة">
                    </div>
                    
                    ${failedAttempts > 0 ? `
                        <div style="margin-top: 10px; color: var(--warning-color); font-size: 0.9rem;">
                            <i class="fas fa-exclamation-triangle"></i> محاولات فاشلة: ${failedAttempts}/${MAX_ATTEMPTS}
                        </div>
                    ` : ''}
                    
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" id="cancelChangePassword_${modalId}">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                        <button type="submit" class="btn-submit">
                            <i class="fas fa-save"></i> حفظ التغييرات
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // إضافة النموذج إلى الجسم
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = passwordHTML;
    document.body.appendChild(modalDiv);
    
    // إضافة مستمعي الأحداث
    const form = document.getElementById(`changePasswordForm_${modalId}`);
    const cancelBtn = document.getElementById(`cancelChangePassword_${modalId}`);
    const closeBtn = document.getElementById(`closeChangePassword_${modalId}`);
    const modal = document.getElementById(modalId);
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleChangePasswordSubmit(modalId);
    });
    
    cancelBtn.addEventListener('click', function() {
        modal.remove();
    });
    
    closeBtn.addEventListener('click', function() {
        modal.remove();
    });
    
    // إغلاق النموذج بالضغط خارجيه
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
    
    // التركيز على حقل كلمة المرور
    setTimeout(() => {
        document.getElementById(`currentPassword_${modalId}`).focus();
    }, 100);
}

// التعامل مع تغيير كلمة المرور
function handleChangePasswordSubmit(modalId) {
    const currentPassword = document.getElementById(`currentPassword_${modalId}`).value;
    const newPassword = document.getElementById(`newPassword_${modalId}`).value;
    const confirmPassword = document.getElementById(`confirmPassword_${modalId}`).value;
    
    // التحقق من الحقول المطلوبة
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    // التحقق من كلمة المرور الحالية
    if (currentPassword !== PASSWORD) {
        failedAttempts++;
        saveSecuritySettings();
        
        // التحقق من تجاوز الحد الأقصى للمحاولات
        if (failedAttempts >= MAX_ATTEMPTS) {
            // قفل النظام
            isLocked = true;
            lockUntil = Date.now() + LOCK_TIME;
            saveSecuritySettings();
            
            // إغلاق النموذج
            const modal = document.getElementById(modalId);
            modal.remove();
            
            // إظهار رسالة القفل
            const lockMinutes = Math.ceil(LOCK_TIME / 60000);
            showNotification(`تم تجاوز الحد الأقصى للمحاولات! النظام مقفل لمدة ${lockMinutes} دقيقة`, 'error');
            
        } else {
            // إظهار رسالة خطأ
            const remainingAttempts = MAX_ATTEMPTS - failedAttempts;
            showNotification(`كلمة المرور الحالية غير صحيحة! لديك ${remainingAttempts} محاولة${remainingAttempts > 1 ? 'ات' : ''}`, 'error');
            
            // اهتزاز حقل الإدخال
            const input = document.getElementById(`currentPassword_${modalId}`);
            input.style.animation = 'shake 0.5s';
            input.value = '';
            input.focus();
            
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        }
        return;
    }
    
    // التحقق من طول كلمة المرور الجديدة
    if (newPassword.length < 6) {
        showNotification('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
        document.getElementById(`newPassword_${modalId}`).focus();
        return;
    }
    
    // التحقق من تطابق كلمتي المرور
    if (newPassword !== confirmPassword) {
        showNotification('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
        document.getElementById(`confirmPassword_${modalId}`).focus();
        return;
    }
    
    // تغيير كلمة المرور
    PASSWORD = newPassword;
    savePasswordToStorage();
    failedAttempts = 0;
    saveSecuritySettings();
    
    // إغلاق النموذج
    const modal = document.getElementById(modalId);
    modal.remove();
    
    // إظهار رسالة نجاح
    showNotification('تم تغيير كلمة المرور بنجاح!', 'success');
}

// ============================================
// إدارة قاعدة البيانات Supabase
// ============================================

let supabaseClient = null;

// تهيئة Supabase
async function initSupabase() {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ تم تهيئة Supabase بنجاح');
        return true;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Supabase:', error);
        showNotification('حدث خطأ في الاتصال بقاعدة البيانات', 'error');
        return false;
    }
}

// تحميل البيانات من قاعدة البيانات
async function loadDataFromDatabase() {
    try {
        console.log('📥 جاري تحميل البيانات من قاعدة البيانات...');
        
        // تحميل المدربين
        const { data: trainersData, error: trainersError } = await supabaseClient
            .from('trainers')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (trainersError) throw trainersError;
        
        // تحميل الكورسات
        const { data: coursesData, error: coursesError } = await supabaseClient
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (coursesError) throw coursesError;
        
        // تحديث البيانات المحلية
        trainers = trainersData || [];
        courses = coursesData || [];
        
        // تحديث البيانات المصفاة
        filteredTrainers = [...trainers];
        filteredCourses = [...courses];
        
        console.log(`✅ تم تحميل ${trainers.length} مدرب من قاعدة البيانات`);
        console.log(`✅ تم تحميل ${courses.length} كورس من قاعدة البيانات`);
        
        // حفظ نسخة محلية للعمل في وضع عدم الاتصال
        saveTrainersToStorage();
        saveCoursesToStorage();
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات من قاعدة البيانات:', error);
        
        // محاولة تحميل البيانات المحلية كنسخة احتياطية
        loadTrainersFromStorage();
        loadCoursesFromStorage();
        
        showNotification('تم تحميل البيانات المحلية بسبب مشكلة في الاتصال', 'warning');
        return false;
    }
}

// حفظ مدرب في قاعدة البيانات
async function saveTrainerToDatabase(trainer) {
    try {
        let result;
        
        if (trainer.id) {
            // تحديث مدرب موجود
            const { data, error } = await supabaseClient
                .from('trainers')
                .update({
                    name: trainer.name,
                    phone: trainer.phone,
                    email: trainer.email,
                    nationality: trainer.nationality,
                    gender: trainer.gender,
                    qualification: trainer.qualification,
                    specialization: trainer.specialization,
                    details: trainer.details,
                    id_file: trainer.idFile,
                    cv_file: trainer.cvFile,
                    updated_at: new Date().toISOString()
                })
                .eq('id', trainer.id)
                .select();
            
            if (error) throw error;
            result = data[0];
        } else {
            // إضافة مدرب جديد
            const { data, error } = await supabaseClient
                .from('trainers')
                .insert({
                    name: trainer.name,
                    phone: trainer.phone,
                    email: trainer.email,
                    nationality: trainer.nationality,
                    gender: trainer.gender,
                    qualification: trainer.qualification,
                    specialization: trainer.specialization,
                    details: trainer.details,
                    id_file: trainer.idFile,
                    cv_file: trainer.cvFile,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            result = data[0];
        }
        
        console.log('💾 تم حفظ المدرب في قاعدة البيانات');
        return result;
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المدرب في قاعدة البيانات:', error);
        throw error;
    }
}

// حذف مدرب من قاعدة البيانات
async function deleteTrainerFromDatabase(id) {
    try {
        const { error } = await supabaseClient
            .from('trainers')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('🗑️ تم حذف المدرب من قاعدة البيانات');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حذف المدرب من قاعدة البيانات:', error);
        throw error;
    }
}

// حفظ كورس في قاعدة البيانات
async function saveCourseToDatabase(course) {
    try {
        let result;
        
        if (course.id) {
            // تحديث كورس موجود
            const { data, error } = await supabaseClient
                .from('courses')
                .update({
                    name_ar: course.nameAr,
                    name_en: course.nameEn,
                    sub_specialization: course.subSpecialization,
                    updated_at: new Date().toISOString()
                })
                .eq('id', course.id)
                .select();
            
            if (error) throw error;
            result = data[0];
        } else {
            // إضافة كورس جديد
            const { data, error } = await supabaseClient
                .from('courses')
                .insert({
                    name_ar: course.nameAr,
                    name_en: course.nameEn,
                    sub_specialization: course.subSpecialization,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            result = data[0];
        }
        
        console.log('💾 تم حفظ الكورس في قاعدة البيانات');
        return result;
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الكورس في قاعدة البيانات:', error);
        throw error;
    }
}

// حذف كورس من قاعدة البيانات
async function deleteCourseFromDatabase(id) {
    try {
        const { error } = await supabaseClient
            .from('courses')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('🗑️ تم حذف الكورس من قاعدة البيانات');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حذف الكورس من قاعدة البيانات:', error);
        throw error;
    }
}

// حذف جميع المدربين من قاعدة البيانات
async function deleteAllTrainersFromDatabase() {
    try {
        const { error } = await supabaseClient
            .from('trainers')
            .delete()
            .neq('id', 0); // حذف جميع السجلات
        
        if (error) throw error;
        
        console.log('🗑️ تم حذف جميع المدربين من قاعدة البيانات');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حذف جميع المدربين من قاعدة البيانات:', error);
        throw error;
    }
}

// حذف جميع الكورسات من قاعدة البيانات
async function deleteAllCoursesFromDatabase() {
    try {
        const { error } = await supabaseClient
            .from('courses')
            .delete()
            .neq('id', 0); // حذف جميع السجلات
        
        if (error) throw error;
        
        console.log('🗑️ تم حذف جميع الكورسات من قاعدة البيانات');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حذف جميع الكورسات من قاعدة البيانات:', error);
        throw error;
    }
}

// ============================================
// إدارة البيانات والتخزين المحلي
// ============================================

// تحميل المدربين من LocalStorage
function loadTrainersFromStorage() {
    try {
        const storedTrainers = localStorage.getItem(STORAGE_KEY);
        
        if (storedTrainers) {
            trainers = JSON.parse(storedTrainers);
            console.log(`✅ تم تحميل ${trainers.length} مدرب من التخزين المحلي`);
        }
        
        filteredTrainers = [...trainers];
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات المحلية:', error);
        trainers = [];
        filteredTrainers = [];
    }
}

// تحميل الكورسات من LocalStorage
function loadCoursesFromStorage() {
    try {
        const storedCourses = localStorage.getItem(COURSES_KEY);
        
        if (storedCourses) {
            courses = JSON.parse(storedCourses);
            console.log(`✅ تم تحميل ${courses.length} كورس من التخزين المحلي`);
        }
        
        filteredCourses = [...courses];
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الكورسات المحلية:', error);
        courses = [];
        filteredCourses = [];
    }
}

// حفظ المدربين في LocalStorage
function saveTrainersToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trainers));
        console.log(`💾 تم حفظ ${trainers.length} مدرب في التخزين المحلي`);
        
        updateStorageStatus();
        showAutoSaveNotification();
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات المحلية:', error);
        return false;
    }
}

// حفظ الكورسات في LocalStorage
function saveCoursesToStorage() {
    try {
        localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
        console.log(`💾 تم حفظ ${courses.length} كورس في التخزين المحلي`);
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الكورسات المحلية:', error);
        return false;
    }
}

// إنشاء نسخة احتياطية
function createBackup() {
    try {
        const backup = {
            trainers: trainers,
            courses: courses,
            timestamp: new Date().toISOString(),
            trainerCount: trainers.length,
            courseCount: courses.length,
            version: '2.3'
        };
        
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
        console.log('📦 تم إنشاء نسخة احتياطية محلية');
        return true;
    } catch (error) {
        console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
        return false;
    }
}

// تحديث حالة التخزين
function updateStorageStatus() {
    try {
        // حساب نسبة استخدام التخزين
        const trainersSize = JSON.stringify(trainers).length;
        const coursesSize = JSON.stringify(courses).length;
        const totalSize = trainersSize + coursesSize;
        const maxSize = 5 * 1024 * 1024; // 5MB الحد الأقصى
        const percentage = Math.min(100, Math.round((totalSize / maxSize) * 100));
        
        // تحديث العرض
        document.getElementById('storageStatus').textContent = `${100 - percentage}%`;
        
        // تغيير اللون حسب النسبة
        const storageElement = document.getElementById('storageStatus');
        if (percentage > 90) {
            storageElement.style.color = 'var(--danger-color)';
        } else if (percentage > 70) {
            storageElement.style.color = 'var(--warning-color)';
        } else {
            storageElement.style.color = 'white';
        }
        
    } catch (error) {
        console.error('خطأ في تحديث حالة التخزين:', error);
    }
}

// ============================================
// إعداد مستمعي الأحداث
// ============================================

function setupEventListeners() {
    console.log("🔧 إعداد مستمعي الأحداث...");
    
    // بحث وتصفية المدربين
    document.getElementById('searchInput').addEventListener('input', filterTrainers);
    document.getElementById('genderFilter').addEventListener('change', filterTrainers);
    document.getElementById('qualificationFilter').addEventListener('change', filterTrainers);
    document.getElementById('specializationFilter').addEventListener('change', filterTrainers);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // بحث الكورسات
    document.getElementById('courseSearchInput').addEventListener('input', filterCourses);
    document.getElementById('resetCourseFilters').addEventListener('click', resetCourseFilters);
    
    // فتح نموذج إضافة مدرب (محمي)
    document.getElementById('openAddForm').addEventListener('click', () => {
        requirePassword('add_trainer', openAddForm);
    });
    
    // فتح نموذج إضافة كورس (محمي)
    document.getElementById('openCourseForm').addEventListener('click', () => {
        requirePassword('add_course', openCourseForm);
    });
    
    // حذف جميع المدربين (محمي)
    document.getElementById('deleteAllTrainersBtn').addEventListener('click', () => {
        requirePassword('delete_all_trainers', confirmDeleteAllTrainers);
    });
    
    // حذف جميع الكورسات (محمي)
    document.getElementById('deleteAllCoursesBtn').addEventListener('click', () => {
        requirePassword('delete_all_courses', confirmDeleteAllCourses);
    });
    
    // إغلاق النوافذ المنبثقة لحذف الكل
    document.getElementById('closeDeleteAllTrainers').addEventListener('click', closeDeleteAllTrainersModal);
    document.getElementById('cancelDeleteAllTrainers').addEventListener('click', closeDeleteAllTrainersModal);
    document.getElementById('closeDeleteAllCourses').addEventListener('click', closeDeleteAllCoursesModal);
    document.getElementById('cancelDeleteAllCourses').addEventListener('click', closeDeleteAllCoursesModal);
    
    // تأكيد الحذف (محمي)
    document.getElementById('confirmDeleteAllTrainers').addEventListener('click', () => {
        requirePassword('confirm_delete_all_trainers', deleteAllTrainers);
    });
    document.getElementById('confirmDeleteAllCourses').addEventListener('click', () => {
        requirePassword('confirm_delete_all_courses', deleteAllCourses);
    });
    
    // إغلاق النماذج المنبثقة
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeProfile').addEventListener('click', closeProfile);
    document.getElementById('cancelForm').addEventListener('click', closeModal);
    document.getElementById('closeConfirm').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDelete').addEventListener('click', closeConfirmModal);
    document.getElementById('closeCourseModal').addEventListener('click', closeCourseModal);
    document.getElementById('cancelCourseForm').addEventListener('click', closeCourseModal);
    document.getElementById('closeConfirmCourse').addEventListener('click', closeConfirmCourseModal);
    document.getElementById('cancelCourseDelete').addEventListener('click', closeConfirmCourseModal);
    
    // إرسال النماذج (محمية)
    document.getElementById('trainerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        requirePassword('save_trainer', saveTrainer, e);
    });
    
    document.getElementById('courseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        requirePassword('save_course', saveCourse, e);
    });
    
    // تأكيد الحذف (محمي)
    document.getElementById('confirmDelete').addEventListener('click', () => {
        requirePassword('confirm_delete', confirmDelete);
    });
    document.getElementById('confirmCourseDelete').addEventListener('click', () => {
        requirePassword('confirm_course_delete', confirmCourseDelete);
    });
    
    // تبديل الوضع الليلي/النهاري
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // استيراد وتصدير البيانات للمدربين (محمية)
    document.getElementById('exportBtn').addEventListener('click', () => {
        requirePassword('export_data', exportTrainersData);
    });
    document.getElementById('importBtn').addEventListener('click', () => {
        requirePassword('import_data', () => {
            document.getElementById('importInput').click();
        });
    });
    document.getElementById('importInput').addEventListener('change', handleImport);
    
    // استيراد وتصدير البيانات للكورسات (محمية)
    document.getElementById('exportCoursesBtn').addEventListener('click', () => {
        requirePassword('export_courses', exportCoursesData);
    });
    document.getElementById('importCoursesBtn').addEventListener('click', () => {
        requirePassword('import_courses', () => {
            document.getElementById('importCoursesInput').click();
        });
    });
    document.getElementById('importCoursesInput').addEventListener('change', handleCoursesImport);
    
    // النسخ الاحتياطي والاستعادة (محمية)
    document.getElementById('backupBtn').addEventListener('click', () => {
        requirePassword('backup', handleBackup);
    });
    document.getElementById('restoreBtn').addEventListener('click', () => {
        requirePassword('restore', handleRestore);
    });
    
    // تغيير كلمة المرور
    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        requirePassword('change_password', openChangePasswordModal);
    });
    
    // زر إعدادات الحماية
    document.getElementById('protectionSettingsBtn').addEventListener('click', () => {
        showProtectionSettings();
    });
    
    // رفع الملفات
    document.getElementById('idFileBtn').addEventListener('click', () => {
        document.getElementById('idFile').click();
    });
    document.getElementById('cvFileBtn').addEventListener('click', () => {
        document.getElementById('cvFile').click();
    });
    
    document.getElementById('idFile').addEventListener('change', handleFileSelect);
    document.getElementById('cvFile').addEventListener('change', handleFileSelect);
    
    // إضافة مستمعي الأحداث الجديدة
    document.getElementById('closeImageModal').addEventListener('click', () => {
        document.getElementById('imageModal').style.display = 'none';
    });
    
    document.getElementById('closePdfModal').addEventListener('click', () => {
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.src = '';
        document.getElementById('pdfModal').style.display = 'none';
    });
    
    // إغلاق النماذج بالضغط خارجها
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('trainerModal');
        const profileModal = document.getElementById('profileModal');
        const confirmModal = document.getElementById('confirmModal');
        const courseModal = document.getElementById('courseModal');
        const confirmCourseModal = document.getElementById('confirmCourseModal');
        const imageModal = document.getElementById('imageModal');
        const pdfModal = document.getElementById('pdfModal');
        const deleteAllTrainersModal = document.getElementById('confirmDeleteAllTrainersModal');
        const deleteAllCoursesModal = document.getElementById('confirmDeleteAllCoursesModal');
        const protectionModal = document.getElementById('protectionModal');
        
        if (event.target === deleteAllTrainersModal) closeDeleteAllTrainersModal();
        if (event.target === deleteAllCoursesModal) closeDeleteAllCoursesModal();
        if (event.target === modal) closeModal();
        if (event.target === profileModal) closeProfile();
        if (event.target === confirmModal) closeConfirmModal();
        if (event.target === courseModal) closeCourseModal();
        if (event.target === confirmCourseModal) closeConfirmCourseModal();
        if (event.target === imageModal) {
            document.getElementById('imageModal').style.display = 'none';
        }
        if (event.target === pdfModal) {
            const pdfViewer = document.getElementById('pdfViewer');
            pdfViewer.src = '';
            document.getElementById('pdfModal').style.display = 'none';
        }
        if (event.target === protectionModal) {
            document.getElementById('protectionModal').style.display = 'none';
        }
    });
    
    console.log("✅ تم إعداد جميع مستمعي الأحداث");
}

// ============================================
// إدارة رفع الملفات
// ============================================

// التعامل مع اختيار الملفات
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // التحقق من الحجم
    const maxSize = event.target.id === 'idFile' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification(`حجم الملف كبير جداً! الحد الأقصى ${maxSize / (1024 * 1024)}MB`, 'error');
        event.target.value = '';
        return;
    }
    
    // التحقق من صيغة الملف
    const validIdFormats = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const validCvFormats = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const isValidFormat = event.target.id === 'idFile' 
        ? validIdFormats.includes(file.type)
        : validCvFormats.includes(file.type);
    
    if (!isValidFormat) {
        showNotification('صيغة الملف غير مدعومة!', 'error');
        event.target.value = '';
        return;
    }
    
    // عرض اسم الملف
    const fileNameElement = document.getElementById(`${event.target.id}Name`);
    fileNameElement.textContent = file.name;
    fileNameElement.style.color = 'var(--success-color)';
}

// تحويل الملف إلى Base64
function convertFileToBase64Promise(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileInfo = {
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result
            };
            resolve(fileInfo);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// عرض المدربين
// ============================================

function renderTrainers(page = 1) {
    console.log("🎨 عرض المدربين - الصفحة:", page);
    
    currentPage = page;
    const trainersContainer = document.getElementById('trainersContainer');
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // حساب عدد الصفحات
    const totalPages = Math.max(1, Math.ceil(filteredTrainers.length / trainersPerPage));
    
    // حساب مؤشرات البداية والنهاية
    const startIndex = (page - 1) * trainersPerPage;
    const endIndex = startIndex + trainersPerPage;
    const pageTrainers = filteredTrainers.slice(startIndex, endIndex);
    
    // تفريغ الحاوية
    trainersContainer.innerHTML = '';
    
    // عرض المدربين
    if (pageTrainers.length === 0) {
        trainersContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-user-slash"></i>
                <h3>لا توجد نتائج</h3>
                <p>لم يتم العثور على مدربين مطابقين لمعايير البحث</p>
                <button class="btn-add" id="addFirstTrainer">
                    <i class="fas fa-user-plus"></i> إضافة أول مدرب
                </button>
            </div>
        `;
        
        document.getElementById('addFirstTrainer')?.addEventListener('click', () => {
            requirePassword('add_first_trainer', openAddForm);
        });
    } else {
        pageTrainers.forEach(trainer => {
            const trainerCard = createTrainerCard(trainer);
            trainersContainer.appendChild(trainerCard);
        });
    }
    
    // عرض الترقيم
    renderPagination(totalPages);
    
    // تحديث معلومات الترقيم
    const from = filteredTrainers.length > 0 ? startIndex + 1 : 0;
    const to = Math.min(endIndex, filteredTrainers.length);
    paginationInfo.textContent = `عرض ${from}-${to} من ${filteredTrainers.length} مدرب`;
    
    // تحديث نتائج التصفية
    updateFilterResults();
    
    console.log(`✅ تم عرض ${pageTrainers.length} مدرب في الصفحة ${page}`);
}

// إنشاء بطاقة المدرب
function createTrainerCard(trainer) {
    console.log("🛠️ إنشاء بطاقة للمدرب:", trainer.name);
    
    const card = document.createElement('div');
    card.className = 'trainer-card';
    card.dataset.id = trainer.id;
    
    // تحديد أيقونة الجنس
    const genderIcon = trainer.gender === 'ذكر' ? 'fa-male' : 'fa-female';
    const genderClass = trainer.gender === 'ذكر' ? 'male' : 'female';
    
    // تنسيق التاريخ
    const createdDate = new Date(trainer.created_at || trainer.createdAt).toLocaleDateString('ar-EG');
    
    card.innerHTML = `
        <div class="trainer-id">${trainer.id || 'N/A'}</div>
        <div class="trainer-header ${genderClass}-header">
            <div class="trainer-avatar">
                <i class="fas ${genderIcon}"></i>
            </div>
            <div class="trainer-info">
                <h4>${trainer.name}</h4>
                <p>${trainer.specialization}</p>
            </div>
        </div>
        <div class="trainer-details">
            <div class="detail-row">
                <span class="detail-label"><i class="fas fa-phone"></i> الهاتف</span>
                <span class="detail-value">${trainer.phone}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fas fa-envelope"></i> البريد</span>
                <span class="detail-value">${trainer.email}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fas fa-globe"></i> الجنسية</span>
                <span class="detail-value">${trainer.nationality}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fas fa-graduation-cap"></i> المؤهل</span>
                <span class="detail-value">${trainer.qualification}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fas fa-calendar"></i> تاريخ الإضافة</span>
                <span class="detail-value">${createdDate}</span>
            </div>
        </div>
        <div class="trainer-actions">
            <button class="btn-action btn-view" data-id="${trainer.id}">
                <i class="fas fa-eye"></i> عرض الملف
            </button>
            <button class="btn-action btn-edit" data-id="${trainer.id}">
                <i class="fas fa-edit"></i> تعديل
            </button>
            <button class="btn-action btn-delete" data-id="${trainer.id}">
                <i class="fas fa-trash"></i> حذف
            </button>
        </div>
    `;
    
    // إضافة مستمعي الأحداث للأزرار
    const viewBtn = card.querySelector('.btn-view');
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    
    viewBtn.addEventListener('click', () => {
        console.log("👁️ عرض الملف الشخصي للمدرب:", trainer.id);
        viewTrainerProfile(trainer.id);
    });
    
    editBtn.addEventListener('click', () => {
        console.log("✏️ طلب تعديل المدرب:", trainer.id);
        requirePassword('edit_trainer', () => {
            console.log("✅ تم التحقق من الهوية، فتح نموذج التعديل للمدرب:", trainer.id);
            editTrainer(trainer.id);
        });
    });
    
    deleteBtn.addEventListener('click', () => {
        console.log("🗑️ طلب حذف المدرب:", trainer.id);
        requirePassword('delete_trainer', () => {
            console.log("✅ تم التحقق من الهوية، تأكيد حذف المدرب:", trainer.id);
            confirmDeleteTrainer(trainer.id);
        });
    });
    
    console.log(`✅ تم إنشاء بطاقة للمدرب ${trainer.name} (ID: ${trainer.id})`);
    return card;
}

// عرض الترقيم
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // زر الصفحة السابقة
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" data-page="${currentPage - 1}"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `<span class="page-dots">...</span>`;
        }
    }
    
    // زر الصفحة التالية
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" data-page="${currentPage + 1}"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // إضافة مستمعي الأحداث لأزرار الصفحات
    pagination.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            renderTrainers(page);
        });
    });
}

// ============================================
// إدارة الكورسات
// ============================================

// عرض الكورسات
function renderCourses(page = 1) {
    console.log("🎨 عرض الكورسات - الصفحة:", page);
    
    currentCoursePage = page;
    const coursesContainer = document.getElementById('coursesContainer');
    const coursePagination = document.getElementById('coursePagination');
    const coursePaginationInfo = document.getElementById('coursePaginationInfo');
    
    // حساب عدد الصفحات
    const totalPages = Math.max(1, Math.ceil(filteredCourses.length / coursesPerPage));
    
    // حساب مؤشرات البداية والنهاية
    const startIndex = (page - 1) * coursesPerPage;
    const endIndex = startIndex + coursesPerPage;
    const pageCourses = filteredCourses.slice(startIndex, endIndex);
    
    // تفريغ الحاوية
    coursesContainer.innerHTML = '';
    
    // عرض الكورسات
    if (pageCourses.length === 0) {
        coursesContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-book"></i>
                <h3>لا توجد كورسات</h3>
                <p>لم يتم إضافة أي كورسات بعد</p>
                <button class="btn-add" id="addFirstCourse">
                    <i class="fas fa-plus-circle"></i> إضافة أول كورس
                </button>
            </div>
        `;
        
        document.getElementById('addFirstCourse')?.addEventListener('click', () => {
            requirePassword('add_first_course', openCourseForm);
        });
    } else {
        pageCourses.forEach(course => {
            const courseCard = createCourseCard(course);
            coursesContainer.appendChild(courseCard);
        });
    }
    
    // عرض الترقيم للكورسات
    renderCoursePagination(totalPages);
    
    // تحديث معلومات الترقيم
    const from = filteredCourses.length > 0 ? startIndex + 1 : 0;
    const to = Math.min(endIndex, filteredCourses.length);
    coursePaginationInfo.textContent = `عرض ${from}-${to} من ${filteredCourses.length} كورس`;
    
    console.log(`✅ تم عرض ${pageCourses.length} كورس في الصفحة ${page}`);
}

// إنشاء بطاقة الكورس
function createCourseCard(course) {
    console.log("🛠️ إنشاء بطاقة للكورس:", course.name_ar || course.nameAr);
    
    const card = document.createElement('div');
    card.className = 'course-card';
    card.dataset.id = course.id;
    
    const createdDate = new Date(course.created_at || course.createdAt).toLocaleDateString('ar-EG');
    
    card.innerHTML = `
        <div class="course-header">
            <h4>${course.name_ar || course.nameAr}</h4>
            <div class="course-id">${course.id || 'N/A'}</div>
        </div>
        <div class="course-details">
            <div class="course-detail">
                <span class="detail-label"><i class="fas fa-font"></i> الاسم (عربي) </span>
                <span class="detail-value">${course.name_ar || course.nameAr}</span>
            </div>
            <div class="course-detail">
                <span class="detail-label"><i class="fas fa-font"></i> الاسم (إنجليزي) </span>
                <span class="detail-value">${course.name_en || course.nameEn}</span>
            </div>
            <div class="course-detail">
                <span class="detail-label"><i class="fas fa-tags"></i> التخصص الفرعي </span>
                <span class="detail-value">${course.sub_specialization || course.subSpecialization || 'غير محدد'}</span>
            </div>
            <div class="course-detail">
                <span class="detail-label"><i class="fas fa-calendar"></i> تاريخ الإضافة</span>
                <span class="detail-value">${createdDate}</span>
            </div>
        </div>
        <div class="course-actions">
            <button class="btn-course-action btn-edit-course" data-id="${course.id}">
                <i class="fas fa-edit"></i> تعديل
            </button>
            <button class="btn-course-action btn-delete-course" data-id="${course.id}">
                <i class="fas fa-trash"></i> حذف
            </button>
        </div>
    `;
    
    // إضافة مستمعي الأحداث للأزرار
    const editBtn = card.querySelector('.btn-edit-course');
    const deleteBtn = card.querySelector('.btn-delete-course');
    
    editBtn.addEventListener('click', () => {
        console.log("✏️ طلب تعديل الكورس:", course.id);
        requirePassword('edit_course', () => {
            console.log("✅ تم التحقق من الهوية، فتح نموذج التعديل للكورس:", course.id);
            editCourse(course.id);
        });
    });
    
    deleteBtn.addEventListener('click', () => {
        console.log("🗑️ طلب حذف الكورس:", course.id);
        requirePassword('delete_course', () => {
            console.log("✅ تم التحقق من الهوية، تأكيد حذف الكورس:", course.id);
            confirmDeleteCourse(course.id);
        });
    });
    
    console.log(`✅ تم إنشاء بطاقة للكورس ${course.name_ar || course.nameAr} (ID: ${course.id})`);
    return card;
}

// عرض الترقيم للكورسات
function renderCoursePagination(totalPages) {
    const coursePagination = document.getElementById('coursePagination');
    
    if (totalPages <= 1) {
        coursePagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // زر الصفحة السابقة
    if (currentCoursePage > 1) {
        paginationHTML += `<button class="page-btn" data-page="${currentCoursePage - 1}"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentCoursePage - 2 && i <= currentCoursePage + 2)) {
            paginationHTML += `<button class="page-btn ${i === currentCoursePage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentCoursePage - 3 || i === currentCoursePage + 3) {
            paginationHTML += `<span class="page-dots">...</span>`;
        }
    }
    
    // زر الصفحة التالية
    if (currentCoursePage < totalPages) {
        paginationHTML += `<button class="page-btn" data-page="${currentCoursePage + 1}"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    coursePagination.innerHTML = paginationHTML;
    
    // إضافة مستمعي الأحداث لأزرار الصفحات
    coursePagination.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            renderCourses(page);
        });
    });
}

// فتح نموذج إضافة كورس
function openCourseForm() {
    document.getElementById('courseModalTitle').textContent = 'إضافة كورس جديد';
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseModal').style.display = 'flex';
    document.getElementById('courseNameAr').focus();
}

// تعديل كورس
function editCourse(id) {
    const course = courses.find(c => c.id === id);
    if (!course) {
        showNotification('لم يتم العثور على الكورس', 'error');
        return;
    }
    
    document.getElementById('courseModalTitle').textContent = 'تعديل الكورس';
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseNameAr').value = course.name_ar || course.nameAr;
    document.getElementById('courseNameEn').value = course.name_en || course.nameEn;
    document.getElementById('courseSubSpecialization').value = course.sub_specialization || course.subSpecialization || '';
    
    document.getElementById('courseModal').style.display = 'flex';
    document.getElementById('courseNameAr').focus();
}

// حفظ الكورس
async function saveCourse(e) {
    // التحقق من صحة البيانات
    const nameAr = document.getElementById('courseNameAr').value.trim();
    const nameEn = document.getElementById('courseNameEn').value.trim();
    const subSpecialization = document.getElementById('courseSubSpecialization').value.trim();
    
    if (!nameAr || nameAr.length < 2) {
        showNotification('اسم الكورس بالعربي يجب أن يكون حرفين على الأقل', 'error');
        document.getElementById('courseNameAr').focus();
        return;
    }
    
    if (!nameEn || nameEn.length < 2) {
        showNotification('اسم الكورس بالإنجليزي يجب أن يكون حرفين على الأقل', 'error');
        document.getElementById('courseNameEn').focus();
        return;
    }
    
    const id = document.getElementById('courseId').value;
    
    const course = {
        id: id ? parseInt(id) : null,
        nameAr,
        nameEn,
        subSpecialization
    };
    
    try {
        let savedCourse;
        
        if (id) {
            // تحديث كورس موجود
            savedCourse = await saveCourseToDatabase(course);
        } else {
            // إضافة كورس جديد
            savedCourse = await saveCourseToDatabase(course);
        }
        
        // تحديث البيانات المحلية
        if (id) {
            const index = courses.findIndex(c => c.id === parseInt(id));
            if (index !== -1) {
                courses[index] = savedCourse;
            }
        } else {
            courses.push(savedCourse);
        }
        
        // تحديث القائمة المصفاة
        const existingIndex = filteredCourses.findIndex(c => c.id === savedCourse.id);
        if (existingIndex !== -1) {
            filteredCourses[existingIndex] = savedCourse;
        } else {
            filteredCourses.push(savedCourse);
        }
        
        // حفظ التغييرات محليًا
        saveCoursesToStorage();
        
        // إعادة التصفية والعرض
        renderCourses(currentCoursePage);
        closeCourseModal();
        showNotification(id ? 'تم تحديث الكورس بنجاح!' : 'تم إضافة الكورس بنجاح!', 'success');
        
    } catch (error) {
        console.error('خطأ في حفظ الكورس:', error);
        showNotification('حدث خطأ في حفظ الكورس', 'error');
    }
}

// حذف كورس
async function deleteCourse(id) {
    try {
        const course = courses.find(c => c.id === id);
        if (!course) return;
        
        // حذف من قاعدة البيانات
        await deleteCourseFromDatabase(id);
        
        // حذف من البيانات المحلية
        const index = courses.findIndex(c => c.id === id);
        if (index !== -1) {
            courses.splice(index, 1);
            
            // تحديث القائمة المصفاة
            const filteredIndex = filteredCourses.findIndex(c => c.id === id);
            if (filteredIndex !== -1) {
                filteredCourses.splice(filteredIndex, 1);
            }
            
            // حفظ التغييرات محليًا
            saveCoursesToStorage();
            
            // إعادة التصفية والعرض
            renderCourses(1);
            showNotification(`تم حذف الكورس "${course.name_ar || course.nameAr}" بنجاح!`, 'success');
        }
    } catch (error) {
        console.error('خطأ في حذف الكورس:', error);
        showNotification('حدث خطأ في حذف الكورس', 'error');
    }
}

// تأكيد حذف الكورس
function confirmDeleteCourse(id) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    
    deleteCourseCandidateId = id;
    document.getElementById('confirmCourseMessage').textContent = `هل أنت متأكد من حذف الكورس "${course.name_ar || course.nameAr}"؟ هذا الإجراء لا يمكن التراجع عنه.`;
    document.getElementById('confirmCourseModal').style.display = 'flex';
}

// تنفيذ حذف الكورس
function confirmCourseDelete() {
    if (!deleteCourseCandidateId) return;
    
    deleteCourse(deleteCourseCandidateId);
    closeConfirmCourseModal();
    deleteCourseCandidateId = null;
}

// إغلاق نافذة الكورس
function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
}

// إغلاق نافذة تأكيد حذف الكورس
function closeConfirmCourseModal() {
    document.getElementById('confirmCourseModal').style.display = 'none';
    deleteCourseCandidateId = null;
}

// البحث في الكورسات
function filterCourses() {
    const searchTerm = document.getElementById('courseSearchInput').value.toLowerCase();
    
    filteredCourses = courses.filter(course => {
        // تطبيق البحث
        const matchesSearch = searchTerm === '' || 
            (course.name_ar || course.nameAr).toLowerCase().includes(searchTerm) ||
            (course.name_en || course.nameEn).toLowerCase().includes(searchTerm) ||
            ((course.sub_specialization || course.subSpecialization) && (course.sub_specialization || course.subSpecialization).toLowerCase().includes(searchTerm));
        
        return matchesSearch;
    });
    
    renderCourses(1);
}

// إعادة تعيين بحث الكورسات
function resetCourseFilters() {
    document.getElementById('courseSearchInput').value = '';
    filteredCourses = [...courses];
    renderCourses(1);
}

// ============================================
// البحث والتصفية للمدربين
// ============================================

function filterTrainers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const genderFilter = document.getElementById('genderFilter').value;
    const qualificationFilter = document.getElementById('qualificationFilter').value;
    const specializationFilter = document.getElementById('specializationFilter').value;
    
    filteredTrainers = trainers.filter(trainer => {
        // تطبيق البحث
        const matchesSearch = searchTerm === '' || 
            trainer.name.toLowerCase().includes(searchTerm) ||
            trainer.specialization.toLowerCase().includes(searchTerm) ||
            trainer.nationality.toLowerCase().includes(searchTerm) ||
            trainer.email.toLowerCase().includes(searchTerm) ||
            trainer.qualification.toLowerCase().includes(searchTerm) ||
            (trainer.details && trainer.details.toLowerCase().includes(searchTerm));
        
        // تطبيق التصفية حسب الجنس
        const matchesGender = !genderFilter || trainer.gender === genderFilter;
        
        // تطبيق التصفية حسب المؤهل
        const matchesQualification = !qualificationFilter || trainer.qualification === qualificationFilter;
        
        // تطبيق التصفية حسب التخصص
        const matchesSpecialization = !specializationFilter || trainer.specialization === specializationFilter;
        
        return matchesSearch && matchesGender && matchesQualification && matchesSpecialization;
    });
    
    renderTrainers(1);
}

// تحديث نتائج التصفية
function updateFilterResults() {
    const filterResults = document.getElementById('filterResults');
    const searchTerm = document.getElementById('searchInput').value;
    const genderFilter = document.getElementById('genderFilter').value;
    const qualificationFilter = document.getElementById('qualificationFilter').value;
    const specializationFilter = document.getElementById('specializationFilter').value;
    
    let resultText = `عرض ${filteredTrainers.length} من أصل ${trainers.length} مدرب`;
    
    if (searchTerm || genderFilter || qualificationFilter || specializationFilter) {
        resultText += ' (مصفى)';
    }
    
    filterResults.textContent = resultText;
}

// إعادة تعيين التصفية
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('genderFilter').value = '';
    document.getElementById('qualificationFilter').value = '';
    document.getElementById('specializationFilter').value = '';
    
    filteredTrainers = [...trainers];
    renderTrainers(1);
}

// ============================================
// إدارة المدربين (إضافة/تعديل/حذف)
// ============================================

// فتح نموذج إضافة مدرب
function openAddForm() {
    isEditing = false;
    currentEditId = null;
    
    document.getElementById('modalTitle').textContent = 'إضافة مدرب جديد';
    document.getElementById('trainerForm').reset();
    document.getElementById('trainerId').value = '';
    document.getElementById('idFileName').textContent = 'لم يتم اختيار ملف';
    document.getElementById('idFileName').style.color = 'var(--gray-color)';
    document.getElementById('cvFileName').textContent = 'لم يتم اختيار ملف';
    document.getElementById('cvFileName').style.color = 'var(--gray-color)';
    
    // إعادة تعيين حقول الملفات
    document.getElementById('idFile').value = '';
    document.getElementById('cvFile').value = '';
    
    // تعيين القيم الافتراضية
    document.getElementById('nationality').value = 'مصري';
    document.getElementById('gender').value = 'ذكر';
    document.getElementById('qualification').value = 'بكالوريوس';
    document.getElementById('specialization').value = 'تكنولوجيا المعلومات';
    
    document.getElementById('trainerModal').style.display = 'flex';
    document.getElementById('name').focus();
}

// فتح نموذج تعديل مدرب
function editTrainer(id) {
    const trainer = trainers.find(t => t.id === id);
    if (!trainer) {
        showNotification('لم يتم العثور على المدرب', 'error');
        return;
    }
    
    isEditing = true;
    currentEditId = id;
    
    document.getElementById('modalTitle').textContent = 'تعديل بيانات المدرب';
    document.getElementById('trainerId').value = trainer.id;
    document.getElementById('name').value = trainer.name;
    document.getElementById('phone').value = trainer.phone;
    document.getElementById('email').value = trainer.email;
    document.getElementById('nationality').value = trainer.nationality;
    document.getElementById('gender').value = trainer.gender;
    document.getElementById('qualification').value = trainer.qualification;
    document.getElementById('specialization').value = trainer.specialization;
    document.getElementById('details').value = trainer.details || '';
    
    // عرض معلومات الملفات
    document.getElementById('idFileName').textContent = (trainer.id_file || trainer.idFile) ? 'تم رفع الملف ✓' : 'لم يتم اختيار ملف';
    document.getElementById('idFileName').style.color = (trainer.id_file || trainer.idFile) ? 'var(--success-color)' : 'var(--gray-color)';
    document.getElementById('cvFileName').textContent = (trainer.cv_file || trainer.cvFile) ? 'تم رفع الملف ✓' : 'لم يتم اختيار ملف';
    document.getElementById('cvFileName').style.color = (trainer.cv_file || trainer.cvFile) ? 'var(--success-color)' : 'var(--gray-color)';
    
    // إعادة تعيين حقول الملفات
    document.getElementById('idFile').value = '';
    document.getElementById('cvFile').value = '';
    
    document.getElementById('trainerModal').style.display = 'flex';
    document.getElementById('name').focus();
}

// حفظ المدرب (إضافة/تعديل)
async function saveTrainer(e) {
    // التحقق من صحة البيانات
    if (!validateTrainerForm()) {
        return;
    }
    
    const id = document.getElementById('trainerId').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const nationality = document.getElementById('nationality').value.trim();
    const gender = document.getElementById('gender').value;
    const qualification = document.getElementById('qualification').value;
    const specialization = document.getElementById('specialization').value.trim();
    const details = document.getElementById('details').value.trim();
    
    // الحصول على الملفات
    const idFile = document.getElementById('idFile').files[0];
    const cvFile = document.getElementById('cvFile').files[0];
    
    let idFileData = null;
    let cvFileData = null;
    
    // تحويل الملفات إلى Base64
    if (idFile) {
        idFileData = await convertFileToBase64Promise(idFile);
    }
    
    if (cvFile) {
        cvFileData = await convertFileToBase64Promise(cvFile);
    }
    
    const trainer = {
        id: id ? parseInt(id) : null,
        name,
        phone,
        email,
        nationality,
        gender,
        qualification,
        specialization,
        details,
        idFile: idFileData,
        cvFile: cvFileData
    };
    
    try {
        let savedTrainer;
        
        if (id) {
            // تحديث مدرب موجود
            savedTrainer = await saveTrainerToDatabase(trainer);
        } else {
            // إضافة مدرب جديد
            savedTrainer = await saveTrainerToDatabase(trainer);
        }
        
        // تحديث البيانات المحلية
        if (id) {
            const index = trainers.findIndex(t => t.id === parseInt(id));
            if (index !== -1) {
                trainers[index] = savedTrainer;
            }
        } else {
            trainers.push(savedTrainer);
        }
        
        // تحديث القائمة المصفاة
        const existingIndex = filteredTrainers.findIndex(t => t.id === savedTrainer.id);
        if (existingIndex !== -1) {
            filteredTrainers[existingIndex] = savedTrainer;
        } else {
            filteredTrainers.push(savedTrainer);
        }
        
        // حفظ التغييرات محليًا
        saveTrainersToStorage();
        
        // إنشاء نسخة احتياطية
        createBackup();
        
        // إعادة التصفية والعرض
        filterTrainers();
        closeModal();
        
        // إظهار رسالة نجاح
        showNotification(id ? 'تم تحديث بيانات المدرب بنجاح!' : 'تم إضافة المدرب بنجاح!', 'success');
        
    } catch (error) {
        console.error('خطأ في حفظ المدرب:', error);
        showNotification('حدث خطأ في حفظ بيانات المدرب', 'error');
    }
}

// التحقق من صحة نموذج المدرب
function validateTrainerForm() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const nationality = document.getElementById('nationality').value.trim();
    const gender = document.getElementById('gender').value;
    const qualification = document.getElementById('qualification').value;
    const specialization = document.getElementById('specialization').value.trim();
    
    if (!name || name.length < 3) {
        showNotification('الاسم يجب أن يكون 3 أحرف على الأقل', 'error');
        document.getElementById('name').focus();
        return false;
    }
    
    if (!phone || !/^[0-9]{10,15}$/.test(phone)) {
        showNotification('رقم الهاتف يجب أن يكون بين 10 و15 رقم', 'error');
        document.getElementById('phone').focus();
        return false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('البريد الإلكتروني غير صحيح', 'error');
        document.getElementById('email').focus();
        return false;
    }
    
    if (!nationality) {
        showNotification('الجنسية مطلوبة', 'error');
        document.getElementById('nationality').focus();
        return false;
    }
    
    if (!gender) {
        showNotification('الجنس مطلوب', 'error');
        document.getElementById('gender').focus();
        return false;
    }
    
    if (!qualification) {
        showNotification('المؤهل العلمي مطلوب', 'error');
        document.getElementById('qualification').focus();
        return false;
    }
    
    if (!specialization) {
        showNotification('التخصص مطلوب', 'error');
        document.getElementById('specialization').focus();
        return false;
    }
    
    return true;
}

// ============================================
// عرض الملف الشخصي الكامل مع زر التحميل
// ============================================

// عرض الملف الشخصي الكامل
function viewTrainerProfile(id) {
    const trainer = trainers.find(t => t.id === id);
    if (!trainer) {
        showNotification('لم يتم العثور على المدرب', 'error');
        return;
    }
    
    const genderIcon = trainer.gender === 'ذكر' ? 'fa-male' : 'fa-female';
    const genderText = trainer.gender === 'ذكر' ? 'ذكر' : 'أنثى';
    const createdDate = new Date(trainer.created_at || trainer.createdAt).toLocaleDateString('ar-EG');
    const updatedDate = new Date(trainer.updated_at || trainer.updatedAt).toLocaleDateString('ar-EG');
    
    document.getElementById('profileName').textContent = `الملف الشخصي: ${trainer.name}`;
    
    document.getElementById('profileContent').innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">
                <i class="fas ${genderIcon}"></i>
            </div>
            <div class="profile-title">
                <h2>${trainer.name}</h2>
                <p>${trainer.specialization} | ${trainer.qualification}</p>
            </div>
        </div>
        
        <div class="profile-details">
            <div class="profile-detail">
                <h4><i class="fas fa-phone"></i> رقم الهاتف</h4>
                <p>${trainer.phone}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-envelope"></i> البريد الإلكتروني</h4>
                <p>${trainer.email}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-globe"></i> الجنسية</h4>
                <p>${trainer.nationality}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-venus-mars"></i> الجنس</h4>
                <p>${genderText}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-graduation-cap"></i> المؤهل العلمي</h4>
                <p>${trainer.qualification}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-briefcase"></i> التخصص</h4>
                <p>${trainer.specialization}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-calendar-plus"></i> تاريخ الإضافة</h4>
                <p>${createdDate}</p>
            </div>
            <div class="profile-detail">
                <h4><i class="fas fa-calendar-check"></i> آخر تحديث</h4>
                <p>${updatedDate}</p>
            </div>
        </div>
        
        <div class="profile-full-details">
            <h3><i class="fas fa-info-circle"></i> التفاصيل الكاملة</h3>
            <p>${trainer.details || 'لا توجد تفاصيل إضافية.'}</p>
        </div>
        
        <div class="profile-actions" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: center; gap: 15px;">
                <button class="btn-action btn-download-profile" onclick="downloadTrainerProfile(${trainer.id})" style="background: var(--success-color);">
                    <i class="fas fa-file-word"></i> تحميل الملف الشخصي
                </button>
                <button class="btn-action" onclick="viewIdImage(${trainer.id})" ${!(trainer.id_file || trainer.idFile) ? 'disabled' : ''}>
                    <i class="fas fa-id-card"></i> بطاقة الهوية
                </button>
                <button class="btn-action" onclick="viewCvFile(${trainer.id})" ${!(trainer.cv_file || trainer.cvFile) ? 'disabled' : ''}>
                    <i class="fas fa-file-pdf"></i> السيرة الذاتية
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('profileModal').style.display = 'flex';
}

// ============================================
// تحميل الملف الشخصي بصيغة Word
// ============================================

// دالة لتحميل الملف الشخصي بصيغة Word
function downloadTrainerProfile(trainerId) {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) {
        showNotification('لم يتم العثور على المدرب', 'error');
        return;
    }
    
    showNotification('جاري تحضير ملف المدرب للتحميل...', 'info');
    
    // إنشاء محتوى HTML للملف
    const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>الملف الشخصي للمدرب - ${trainer.name}</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding: 20px;
                    background: linear-gradient(135deg, #2c3e50, #3498db);
                    color: white;
                    border-radius: 10px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                }
                .header .subtitle {
                    font-size: 16px;
                    opacity: 0.9;
                    margin-top: 10px;
                }
                .section {
                    margin-bottom: 30px;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .section h2 {
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .info-item {
                    margin-bottom: 15px;
                }
                .info-item strong {
                    display: block;
                    color: #2c3e50;
                    margin-bottom: 5px;
                    font-size: 16px;
                }
                .info-item span {
                    color: #555;
                    font-size: 14px;
                }
                .details {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    border-right: 4px solid #3498db;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }
                .logo {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .logo h3 {
                    color: #2c3e50;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="logo">
                <h3>أكاديمية هاير للابتكار</h3>
                <p>نظام إدارة المدربين - الإصدار 2.3</p>
            </div>
            
            <div class="header">
                <h1>الملف الشخصي للمدرب</h1>
                <div class="subtitle">${trainer.name}</div>
            </div>
            
            <div class="section">
                <h2>المعلومات الأساسية</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>اسم المدرب:</strong>
                        <span>${trainer.name}</span>
                    </div>
                    <div class="info-item">
                        <strong>رقم الهاتف:</strong>
                        <span>${trainer.phone}</span>
                    </div>
                    <div class="info-item">
                        <strong>البريد الإلكتروني:</strong>
                        <span>${trainer.email}</span>
                    </div>
                    <div class="info-item">
                        <strong>الجنسية:</strong>
                        <span>${trainer.nationality}</span>
                    </div>
                    <div class="info-item">
                        <strong>الجنس:</strong>
                        <span>${trainer.gender}</span>
                    </div>
                    <div class="info-item">
                        <strong>المؤهل العلمي:</strong>
                        <span>${trainer.qualification}</span>
                    </div>
                    <div class="info-item">
                        <strong>التخصص:</strong>
                        <span>${trainer.specialization}</span>
                    </div>
                    <div class="info-item">
                        <strong>تاريخ الإضافة:</strong>
                        <span>${new Date(trainer.created_at || trainer.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>التفاصيل الإضافية</h2>
                <div class="details">
                    ${trainer.details || 'لا توجد تفاصيل إضافية.'}
                </div>
            </div>
            
            <div class="section">
                <h2>معلومات النظام</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>معرف المدرب:</strong>
                        <span>${trainer.id}</span>
                    </div>
                    <div class="info-item">
                        <strong>تاريخ الإنشاء:</strong>
                        <span>${new Date(trainer.created_at || trainer.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div class="info-item">
                        <strong>آخر تحديث:</strong>
                        <span>${new Date(trainer.updated_at || trainer.updatedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div class="info-item">
                        <strong>تاريخ التصدير:</strong>
                        <span>${new Date().toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>تم إنشاء هذا الملف بواسطة نظام إدارة مدربين أكاديمية هاير للابتكار</p>
                <p>© ${new Date().getFullYear()} أكاديمية هاير للابتكار. جميع الحقوق محفوظة.</p>
            </div>
        </body>
        </html>
    `;
    
    // إنشاء Blob من محتوى HTML
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    
    // إنشاء رابط للتحميل
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ملف_المدرب_${trainer.name}_${trainer.id}.doc`;
    
    // إضافة الرابط إلى المستند والنقر عليه
    document.body.appendChild(a);
    a.click();
    
    // تنظيف
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`تم تحميل ملف المدرب ${trainer.name} بنجاح!`, 'success');
    }, 100);
}

// تنسيق حجم الملف
function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// تأكيد حذف المدرب
function confirmDeleteTrainer(id) {
    const trainer = trainers.find(t => t.id === id);
    if (!trainer) return;
    
    deleteCandidateId = id;
    document.getElementById('confirmMessage').textContent = `هل أنت متأكد من حذف المدرب "${trainer.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`;
    document.getElementById('confirmModal').style.display = 'flex';
}

// تنفيذ الحذف
async function confirmDelete() {
    if (!deleteCandidateId) return;
    
    try {
        const trainer = trainers.find(t => t.id === deleteCandidateId);
        if (!trainer) return;
        
        // حذف من قاعدة البيانات
        await deleteTrainerFromDatabase(deleteCandidateId);
        
        // حذف من البيانات المحلية
        const index = trainers.findIndex(t => t.id === deleteCandidateId);
        if (index !== -1) {
            trainers.splice(index, 1);
            
            // تحديث القائمة المصفاة
            const filteredIndex = filteredTrainers.findIndex(t => t.id === deleteCandidateId);
            if (filteredIndex !== -1) {
                filteredTrainers.splice(filteredIndex, 1);
            }
            
            // حفظ التغييرات في LocalStorage
            saveTrainersToStorage();
            
            // إنشاء نسخة احتياطية
            createBackup();
            
            // إعادة التصفية والعرض
            filterTrainers();
            showNotification(`تم حذف المدرب "${trainer.name}" بنجاح!`, 'success');
        }
    } catch (error) {
        console.error('خطأ في حذف المدرب:', error);
        showNotification('حدث خطأ في حذف المدرب', 'error');
    }
    
    closeConfirmModal();
    deleteCandidateId = null;
}

// عرض صورة الهوية
function viewIdImage(trainerId) {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) {
        showNotification('لم يتم العثور على المدرب', 'warning');
        return;
    }
    
    const idFile = trainer.id_file || trainer.idFile;
    if (!idFile || !idFile.data) {
        showNotification('لا توجد صورة للهوية', 'warning');
        return;
    }
    
    if (!idFile.type.startsWith('image/')) {
        // إذا كان ملف PDF أو نوع آخر
        if (idFile.data) {
            const link = document.createElement('a');
            link.href = idFile.data;
            link.download = idFile.name;
            link.click();
        }
        return;
    }
    
    document.getElementById('imageModalContent').innerHTML = `
        <img src="${idFile.data}" alt="بطاقة الهوية للمدرب ${trainer.name}" class="full-image">
        <p class="image-caption">بطاقة الهوية - ${trainer.name}</p>
        <div class="file-actions" style="justify-content: center; margin-top: 20px;">
            <a href="${idFile.data}" class="file-action-btn btn-download-file" download="${idFile.name}">
                <i class="fas fa-download"></i> تحميل الصورة
            </a>
        </div>
    `;
    
    document.getElementById('imageModal').style.display = 'flex';
}

// عرض السيرة الذاتية
function viewCvFile(trainerId) {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) {
        showNotification('لم يتم العثور على المدرب', 'warning');
        return;
    }
    
    const cvFile = trainer.cv_file || trainer.cvFile;
    if (!cvFile) {
        showNotification('لا توجد سيرة ذاتية', 'warning');
        return;
    }
    
    if (cvFile.type === 'application/pdf' && cvFile.data) {
        // عرض ملف PDF
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.src = cvFile.data;
        document.getElementById('pdfModal').style.display = 'flex';
    } else if (cvFile.data) {
        // تنزيل ملفات أخرى (Word)
        const link = document.createElement('a');
        link.href = cvFile.data;
        link.download = cvFile.name;
        link.click();
    } else {
        showNotification('لا يمكن عرض هذا النوع من الملفات، سيتم تنزيله بدلاً من ذلك', 'info');
        if (cvFile.data) {
            const link = document.createElement('a');
            link.href = cvFile.data;
            link.download = cvFile.name;
            link.click();
        }
    }
}

// ============================================
// الإحصائيات
// ============================================

function updateStats() {
    const total = trainers.length;
    const male = trainers.filter(t => t.gender === 'ذكر').length;
    const female = trainers.filter(t => t.gender === 'أنثى').length;
    const phd = trainers.filter(t => t.qualification === 'دكتوراه').length;
    const totalCourses = courses.length;
    
    // تحديث الرأس
    document.getElementById('totalTrainers').textContent = total;
    document.getElementById('maleTrainers').textContent = male;
    document.getElementById('femaleTrainers').textContent = female;
    document.getElementById('totalCourses').textContent = totalCourses;
    
    // تحديث قسم الإحصائيات
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statMale').textContent = male;
    document.getElementById('statFemale').textContent = female;
    document.getElementById('statPhd').textContent = phd;
    document.getElementById('statCourses').textContent = totalCourses;
}

// ============================================
// استيراد وتصدير البيانات
// ============================================

// تصدير بيانات المدربين
function exportTrainersData() {
    try {
        const exportData = {
            trainers: trainers,
            courses: courses,
            exportDate: new Date().toISOString(),
            trainerCount: trainers.length,
            courseCount: courses.length,
            system: 'أكاديمية هاير للابتكار',
            version: '2.3'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `haier_academy_data_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showNotification(`تم تصدير ${trainers.length} مدرب و ${courses.length} كورس بنجاح!`, 'success');
        return true;
    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
        showNotification('حدث خطأ في تصدير البيانات', 'error');
        return false;
    }
}

// استيراد بيانات المدربين
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.trainers || !Array.isArray(importedData.trainers)) {
                showNotification('صيغة الملف غير صحيحة!', 'error');
                return;
            }
            
            if (confirm(`هل تريد استيراد ${importedData.trainers.length} مدرب و ${importedData.courses?.length || 0} كورس؟ سيتم دمجهم مع البيانات الحالية.`)) {
                let importedCount = 0;
                let courseImportedCount = 0;
                
                // استيراد المدربين
                for (const trainer of importedData.trainers) {
                    try {
                        await saveTrainerToDatabase({
                            ...trainer,
                            id: null // إنشاء معرف جديد في قاعدة البيانات
                        });
                        importedCount++;
                    } catch (error) {
                        console.error('خطأ في استيراد مدرب:', error);
                    }
                }
                
                // استيراد الكورسات
                if (importedData.courses) {
                    for (const course of importedData.courses) {
                        try {
                            await saveCourseToDatabase({
                                ...course,
                                id: null // إنشاء معرف جديد في قاعدة البيانات
                            });
                            courseImportedCount++;
                        } catch (error) {
                            console.error('خطأ في استيراد كورس:', error);
                        }
                    }
                }
                
                // إعادة تحميل البيانات من قاعدة البيانات
                await loadDataFromDatabase();
                
                // إعادة التصفية والعرض
                renderTrainers();
                renderCourses();
                updateStats();
                
                showNotification(`تم استيراد ${importedCount} مدرب و ${courseImportedCount} كورس بنجاح!`, 'success');
            }
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            showNotification('حدث خطأ في قراءة الملف! تأكد من صحة صيغة الملف.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// تصدير بيانات الكورسات فقط
function exportCoursesData() {
    try {
        const exportData = {
            courses: courses,
            exportDate: new Date().toISOString(),
            courseCount: courses.length,
            system: 'أكاديمية هاير للابتكار',
            version: '2.3'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `haier_courses_data_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showNotification(`تم تصدير ${courses.length} كورس بنجاح!`, 'success');
        return true;
    } catch (error) {
        console.error('خطأ في تصدير بيانات الكورسات:', error);
        showNotification('حدث خطأ في تصدير بيانات الكورسات', 'error');
        return false;
    }
}

// استيراد بيانات الكورسات فقط
async function handleCoursesImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.courses || !Array.isArray(importedData.courses)) {
                showNotification('صيغة الملف غير صحيحة!', 'error');
                return;
            }
            
            if (confirm(`هل تريد استيراد ${importedData.courses.length} كورس؟ سيتم دمجهم مع الكورسات الحالية.`)) {
                let importedCount = 0;
                
                // استيراد الكورسات
                for (const course of importedData.courses) {
                    try {
                        await saveCourseToDatabase({
                            ...course,
                            id: null // إنشاء معرف جديد في قاعدة البيانات
                        });
                        importedCount++;
                    } catch (error) {
                        console.error('خطأ في استيراد كورس:', error);
                    }
                }
                
                // إعادة تحميل البيانات من قاعدة البيانات
                await loadDataFromDatabase();
                
                // إعادة التصفية والعرض
                renderCourses();
                updateStats();
                
                showNotification(`تم استيراد ${importedCount} كورس بنجاح!`, 'success');
            }
        } catch (error) {
            console.error('خطأ في استيراد بيانات الكورسات:', error);
            showNotification('حدث خطأ في قراءة الملف! تأكد من صحة صيغة الملف.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// النسخ الاحتياطي
function handleBackup() {
    if (createBackup()) {
        showNotification('تم إنشاء نسخة احتياطية محلية بنجاح!', 'success');
    } else {
        showNotification('حدث خطأ في إنشاء النسخة الاحتياطية', 'error');
    }
}

// الاستعادة
function handleRestore() {
    if (confirm('هل تريد استعادة النسخة الاحتياطية المحلية؟ سيتم استبدال جميع البيانات المحلية الحالية.')) {
        loadTrainersFromStorage();
        loadCoursesFromStorage();
        
        filteredTrainers = [...trainers];
        filteredCourses = [...courses];
        
        renderTrainers();
        renderCourses();
        updateStats();
        
        showNotification('تم استعادة النسخة الاحتياطية المحلية بنجاح!', 'success');
    }
}

// ============================================
// إدارة الواجهة
// ============================================

// إغلاق النماذج
function closeModal() {
    document.getElementById('trainerModal').style.display = 'none';
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    deleteCandidateId = null;
}

// تبديل الوضع الليلي/النهاري
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeIcon = document.querySelector('#themeToggle i');
    const isDark = document.body.classList.contains('dark-theme');
    
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    // حفظ التفضيل في التخزين المحلي
    localStorage.setItem('haier_theme', isDark ? 'dark' : 'light');
    
    showNotification(`تم التبديل إلى الوضع ${isDark ? 'الليلي' : 'النهاري'}`, 'info');
}

// تحميل تفضيلات الوضع من التخزين المحلي
function loadThemePreference() {
    const savedTheme = localStorage.getItem('haier_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = 'fas fa-sun';
    }
}

// ============================================
// الإشعارات
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'flex';
    
    // إضافة أيقونة حسب نوع الإشعار
    const icon = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type];
    
    notification.innerHTML = `<i class="${icon}"></i> ${message}`;
    
    // إخفاء الإشعار بعد 3 ثوانٍ
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showAutoSaveNotification() {
    // يمكن تفعيله إذا أردت
}

// ============================================
// دوال حذف الكل
// ============================================

// تأكيد حذف جميع المدربين
function confirmDeleteAllTrainers() {
    if (trainers.length === 0) {
        showNotification('لا يوجد مدربين لحذفهم', 'info');
        return;
    }
    
    const totalTrainers = trainers.length;
    const maleTrainers = trainers.filter(t => t.gender === 'ذكر').length;
    const femaleTrainers = trainers.filter(t => t.gender === 'أنثى').length;
    
    // تحديث الإحصائيات في النافذة
    document.getElementById('totalTrainersToDelete').textContent = totalTrainers;
    document.getElementById('maleTrainersToDelete').textContent = maleTrainers;
    document.getElementById('femaleTrainersToDelete').textContent = femaleTrainers;
    
    // إظهار النافذة
    document.getElementById('confirmDeleteAllTrainersModal').style.display = 'flex';
}

// تأكيد حذف جميع الكورسات
function confirmDeleteAllCourses() {
    if (courses.length === 0) {
        showNotification('لا يوجد كورسات لحذفها', 'info');
        return;
    }
    
    const totalCourses = courses.length;
    const recentCourses = courses.filter(course => {
        const courseDate = new Date(course.created_at || course.createdAt);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return courseDate > oneWeekAgo;
    }).length;
    
    // تحديث الإحصائيات في النافذة
    document.getElementById('totalCoursesToDelete').textContent = totalCourses;
    document.getElementById('recentCoursesToDelete').textContent = recentCourses;
    
    // إظهار النافذة
    document.getElementById('confirmDeleteAllCoursesModal').style.display = 'flex';
}

// حذف جميع المدربين
async function deleteAllTrainers() {
    try {
        const totalDeleted = trainers.length;
        
        // حذف من قاعدة البيانات
        await deleteAllTrainersFromDatabase();
        
        // حذف من البيانات المحلية
        trainers = [];
        filteredTrainers = [];
        
        // حفظ التغييرات محليًا
        saveTrainersToStorage();
        
        // إنشاء نسخة احتياطية
        createBackup();
        
        // إعادة التصفية والعرض
        renderTrainers(1);
        updateStats();
        updateStorageStatus();
        
        // إغلاق النافذة المنبثقة
        closeDeleteAllTrainersModal();
        
        // إظهار رسالة النجاح
        showNotification(`تم حذف جميع المدربين (${totalDeleted} مدرب) بنجاح!`, 'success');
        
    } catch (error) {
        console.error('خطأ في حذف جميع المدربين:', error);
        showNotification('حدث خطأ في حذف جميع المدربين', 'error');
    }
}

// حذف جميع الكورسات
async function deleteAllCourses() {
    try {
        const totalDeleted = courses.length;
        
        // حذف من قاعدة البيانات
        await deleteAllCoursesFromDatabase();
        
        // حذف من البيانات المحلية
        courses = [];
        filteredCourses = [];
        
        // حفظ التغييرات محليًا
        saveCoursesToStorage();
        
        // إنشاء نسخة احتياطية
        createBackup();
        
        // إعادة التصفية والعرض
        renderCourses(1);
        updateStats();
        updateStorageStatus();
        
        // إغلاق النافذة المنبثقة
        closeDeleteAllCoursesModal();
        
        // إظهار رسالة النجاح
        showNotification(`تم حذف جميع الكورسات (${totalDeleted} كورس) بنجاح!`, 'success');
        
    } catch (error) {
        console.error('خطأ في حذف جميع الكورسات:', error);
        showNotification('حدث خطأ في حذف جميع الكورسات', 'error');
    }
}

// إغلاق نوافذ حذف الكل
function closeDeleteAllTrainersModal() {
    document.getElementById('confirmDeleteAllTrainersModal').style.display = 'none';
}

function closeDeleteAllCoursesModal() {
    document.getElementById('confirmDeleteAllCoursesModal').style.display = 'none';
}

// ============================================
// إعدادات الحماية
// ============================================

function showProtectionSettings() {
    const modalId = 'protectionSettingsModal_' + Date.now();
    
    const protectionHTML = `
        <div class="modal" id="${modalId}" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-shield-alt"></i> إعدادات الحماية</h3>
                    <button class="modal-close" id="closeProtection_${modalId}" aria-label="إغلاق النافذة">&times;</button>
                </div>
                <div style="padding: 30px;">
                    <div class="protection-info">
                        <div class="protection-stat">
                            <i class="fas fa-lock"></i>
                            <div>
                                <h4>حالة الحماية</h4>
                                <p>${isLocked ? '🔒 النظام مقفل حالياً' : '✅ النظام غير مقفل'}</p>
                            </div>
                        </div>
                        
                        <div class="protection-stat">
                            <i class="fas fa-key"></i>
                            <div>
                                <h4>محاولات فاشلة</h4>
                                <p>${failedAttempts} / ${MAX_ATTEMPTS}</p>
                            </div>
                        </div>
                        
                        <div class="protection-stat">
                            <i class="fas fa-history"></i>
                            <div>
                                <h4>تاريخ آخر تحديث</h4>
                                <p>${new Date().toLocaleDateString('ar-EG')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="protection-actions" style="margin-top: 30px; display: flex; flex-direction: column; gap: 15px;">
                        <button class="btn-action" id="managePermissions_${modalId}" style="justify-content: center; background: var(--primary-color);">
                            <i class="fas fa-user-shield"></i> إدارة الصلاحيات
                        </button>
                        
                        <button class="btn-add" id="changePasswordFromSettings_${modalId}" style="justify-content: center;">
                            <i class="fas fa-key"></i> تغيير كلمة المرور
                        </button>
                        
                        <button class="btn-reset" id="resetProtection_${modalId}" style="justify-content: center;">
                            <i class="fas fa-redo"></i> إعادة تعيين الحماية
                        </button>
                        
                        ${isLocked ? `
                            <button class="btn-action" id="unlockSystem_${modalId}" style="justify-content: center; background: var(--success-color);">
                                <i class="fas fa-unlock"></i> فتح النظام
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="protection-note" style="margin-top: 30px; padding: 15px; background: rgba(var(--primary-color), 0.05); border-radius: 8px;">
                        <h4><i class="fas fa-info-circle"></i> معلومات الحماية:</h4>
                        <ul style="margin-right: 20px;">
                            <li>كلمة المرور مطلوبة للإجراءات الحساسة</li>
                            <li>يمكنك إدارة الصلاحيات للتحكم في الإجراءات التي تتطلب كلمة مرور</li>
                            <li>الحد الأقصى للمحاولات: ${MAX_ATTEMPTS} محاولات</li>
                            <li>مدة القفل بعد التجاوز: ${LOCK_TIME/60000} دقيقة</li>
                            <li>الحماية تعمل على جميع المتصفحات</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إضافة النموذج إلى الجسم
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = protectionHTML;
    document.body.appendChild(modalDiv);
    
    // إضافة مستمعي الأحداث
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(`closeProtection_${modalId}`);
    const changePasswordBtn = document.getElementById(`changePasswordFromSettings_${modalId}`);
    const resetBtn = document.getElementById(`resetProtection_${modalId}`);
    const unlockBtn = document.getElementById(`unlockSystem_${modalId}`);
    const managePermissionsBtn = document.getElementById(`managePermissions_${modalId}`);
    
    // إغلاق النموذج
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // تغيير كلمة المرور
    changePasswordBtn.addEventListener('click', () => {
        modal.remove();
        requirePassword('change_password', openChangePasswordModal);
    });
    
    // إدارة الصلاحيات (محمية بكلمة مرور)
    managePermissionsBtn.addEventListener('click', () => {
        modal.remove();
        showPermissionsModal();
    });
    
    // إعادة تعيين الحماية
    resetBtn.addEventListener('click', () => {
        if (confirm('هل تريد إعادة تعيين إعدادات الحماية؟ سيتم إعادة تعيين المحاولات الفاشلة وإلغاء القفل.')) {
            failedAttempts = 0;
            isLocked = false;
            lockUntil = 0;
            saveSecuritySettings();
            modal.remove();
            showNotification('تم إعادة تعيين إعدادات الحماية بنجاح!', 'success');
        }
    });
    
    // فتح النظام إذا كان مقفلاً
    if (unlockBtn) {
        unlockBtn.addEventListener('click', () => {
            if (confirm('هل تريد فتح النظام الآن؟ ستظل كلمة المرور كما هي.')) {
                isLocked = false;
                lockUntil = 0;
                failedAttempts = 0;
                saveSecuritySettings();
                modal.remove();
                showNotification('تم فتح النظام بنجاح!', 'success');
            }
        });
    }
    
    // إغلاق النموذج بالضغط خارجيه
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
}

// ============================================
// اختبار النظام
// ============================================

function testSystem() {
    console.log("🧪 بدء اختبار النظام...");
    
    // 1. اختبار عرض المدربين
    if (typeof renderTrainers === 'function') {
        console.log("✅ دالة renderTrainers موجودة");
        renderTrainers();
    } else {
        console.log("❌ دالة renderTrainers غير موجودة!");
    }
    
    // 2. اختبار عرض الكورسات
    if (typeof renderCourses === 'function') {
        console.log("✅ دالة renderCourses موجودة");
        renderCourses();
    } else {
        console.log("❌ دالة renderCourses غير موجودة!");
    }
    
    // 3. اختبار تحميل البيانات
    if (trainers && trainers.length > 0) {
        console.log(`✅ يوجد ${trainers.length} مدرب في الذاكرة`);
    } else {
        console.log("❌ لا يوجد مدربين في الذاكرة");
    }
    
    // 4. اختبار زر التعديل
    setTimeout(() => {
        const editButtons = document.querySelectorAll('.btn-edit');
        console.log(`🔍 عدد أزرار التعديل: ${editButtons.length}`);
        
        if (editButtons.length > 0) {
            console.log("🎯 اضغط على أي زر تعديل لاختبار النظام");
            alert(`🎯 يوجد ${editButtons.length} زر تعديل في الصفحة\n🔑 كلمة المرور: admin123\nاضغط على أي زر تعديل لاختبار النظام`);
        } else {
            console.log("⚠️ لم يتم إنشاء أزرار التعديل!");
            alert("⚠️ لم يتم إنشاء أزرار التعديل!\nتحقق من وحدة التحكم (F12)");
        }
    }, 1000);
}

// ============================================
// تهيئة إضافية
// ============================================

// تحميل تفضيلات الوضع عند التحميل
loadThemePreference();

// اختبار النظام
console.log('🚀 نظام إدارة مدربين أكاديمية هاير للابتكار - الإصدار 2.3');
console.log('🔒 نظام حماية كامل مع صلاحيات متقدمة');
console.log('🔑 إمكانية تغيير كلمة المرور');
console.log('🔧 نظام إدارة الصلاحيات متكامل');
console.log('✅ الاتصال بقاعدة البيانات Supabase');
console.log('✅ الحفظ التلقائي مفعل');
console.log('✅ إدارة الكورسات مفعلة');
console.log('✅ رفع الملفات مفعل');
console.log(`📊 عدد المدربين: ${trainers.length}`);
console.log(`📚 عدد الكورسات: ${courses.length}`);

// اختبار إضافي
window.addEventListener('load', function() {
    setTimeout(function() {
        console.log("📋 اختبار النهاية - النظام جاهز للاستخدام");
    }, 3000);
});

// تصدير الدوال للاستخدام في HTML
window.viewIdImage = viewIdImage;
window.viewCvFile = viewCvFile;
window.requirePassword = requirePassword;
window.testSystem = testSystem;
window.renderTrainers = renderTrainers;
window.renderCourses = renderCourses;
window.downloadTrainerProfile = downloadTrainerProfile;

console.log("🎉 النظام جاهز للعمل!");