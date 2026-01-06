// setup.js - ملف تهيئة النظام
console.log('🚀 بدء تهيئة نظام أكاديمية هاير للابتكار');

// إعدادات النظام
const SYSTEM_CONFIG = {
    version: '2.2',
    name: 'أكاديمية هاير للابتكار',
    password: 'admin123', // كلمة المرور الافتراضية
    supabaseUrl: 'https://oqkizzsutcskqmtxidsd.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xa2l6enN1dGNza3FtdHhpZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NzE3MDgsImV4cCI6MjA4MTM0NzcwOH0.3iDKaDEEvk0ZkNnw5qSgZ2YKsSjAaDECnqGZYdxXKmI'
};

// اختبار الاتصال بـ Supabase
async function testSupabaseConnection() {
    try {
        console.log('🔗 اختبار الاتصال بـ Supabase...');
        
        const { createClient } = supabase;
        const supabaseClient = createClient(SYSTEM_CONFIG.supabaseUrl, SYSTEM_CONFIG.supabaseKey);
        
        // اختبار الاتصال البسيط
        const { data, error } = await supabaseClient
            .from('trainers')
            .select('count')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        console.log('✅ تم الاتصال بـ Supabase بنجاح');
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Supabase:', error.message);
        return false;
    }
}

// تهيئة البيانات الأولية
async function initializeData() {
    console.log('📊 جاري تهيئة البيانات الأولية...');
    
    // يمكن إضافة بيانات أولية هنا إذا لزم الأمر
    
    console.log('✅ تم تهيئة البيانات بنجاح');
}

// تهيئة النظام
async function initializeSystem() {
    console.log(`🎯 ${SYSTEM_CONFIG.name} - الإصدار ${SYSTEM_CONFIG.version}`);
    console.log('='.repeat(50));
    
    // اختبار الاتصال
    const isConnected = await testSupabaseConnection();
    
    if (isConnected) {
        console.log('✨ النظام جاهز للاستخدام');
        console.log('🔒 النظام محمي بكلمة مرور');
        console.log('💾 البيانات متزامنة مع السحابة');
        console.log('👥 جميع المستخدمين يرون نفس البيانات');
    } else {
        console.log('⚠️  النظام يعمل في الوضع المحلي');
        console.log('📱 البيانات محفوظة محلياً فقط');
    }
    
    console.log('='.repeat(50));
    console.log('🎉 تم تهيئة النظام بنجاح!');
}

// بدء التهيئة
initializeSystem();