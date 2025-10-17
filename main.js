let cameras = [
    {
        id: 1,
        name: "البوابة الرئيسية",
        lat: 30.0444,
        lng: 31.2357,
        streamUrl: "rtsp://192.168.1.101:554/stream1",
        status: "online",
        description: "مراقبة المدخل الرئيسي",
        zone: "entrance",
        lastSeen: new Date(),
        resolution: "1920x1080",
        fps: 30
    },
    {
        id: 2,
        name: "موقف السيارات الشمالي",
        lat: 30.0454,
        lng: 31.2367,
        streamUrl: "rtsp://192.168.1.102:554/stream1",
        status: "online",
        description: "مراقبة موقف السيارات الشمالي",
        zone: "parking",
        lastSeen: new Date(),
        resolution: "1280x720",
        fps: 25
    },
    {
        id: 3,
        name: "صالة الاستقبال",
        lat: 30.0434,
        lng: 31.2347,
        streamUrl: "rtsp://192.168.1.103:554/stream1",
        status: "offline",
        description: "مراقبة صالة الاستقبال الداخلية",
        zone: "interior",
        lastSeen: new Date(Date.now() - 300000),
        resolution: "1920x1080",
        fps: 30
    },
    {
        id: 4,
        name: "المخرج الخلفي",
        lat: 30.0424,
        lng: 31.2337,
        streamUrl: "rtsp://192.168.1.104:554/stream1",
        status: "online",
        description: "أمان المخرج الخلفي",
        zone: "entrance",
        lastSeen: new Date(),
        resolution: "1280x720",
        fps: 20
    },
    {
        id: 5,
        name: "منظر الشارع الشرقي",
        lat: 30.0464,
        lng: 31.2377,
        streamUrl: "rtsp://192.168.1.105:554/stream1",
        status: "online",
        description: "مراقبة الشارع الشرقي",
        zone: "perimeter",
        lastSeen: new Date(),
        resolution: "1920x1080",
        fps: 30
    },
    {
        id: 6,
        name: "غرفة الأدلة",
        lat: 30.0414,
        lng: 31.2327,
        streamUrl: "rtsp://192.168.1.106:554/stream1",
        status: "online",
        description: "أمان مخزن الأدلة",
        zone: "special",
        lastSeen: new Date(),
        resolution: "1920x1080",
        fps: 30
    },
    {
        id: 7,
        name: "جناح التحقيق",
        lat: 30.0404,
        lng: 31.2317,
        streamUrl: "rtsp://192.168.1.107:554/stream1",
        status: "offline",
        description: "ممر غرف المقابلات",
        zone: "interior",
        lastSeen: new Date(Date.now() - 600000),
        resolution: "1280x720",
        fps: 25
    },
    {
        id: 8,
        name: "المحيط الجنوبي",
        lat: 30.0394,
        lng: 31.2307,
        streamUrl: "rtsp://192.168.1.108:554/stream1",
        status: "online",
        description: "سياج المحيط الجنوبي",
        zone: "perimeter",
        lastSeen: new Date(),
        resolution: "1920x1080",
        fps: 30
    }
];

// متغيرات الخريطة والواجهة
let map;
let markers = [];
let currentCamera = null;
let currentTileLayer = null;
let isRecording = false;
let recordingInterval = null;
let currentUser = null;
let alertsEnabled = true;
let motionDetectionEnabled = true;

// صلاحيات المستخدمين
const userPermissions = {
    admin: ['view', 'add', 'edit', 'delete', 'settings', 'export', 'record', 'snapshot'],
    operator: ['view', 'add', 'edit', 'export', 'record', 'snapshot'],
    viewer: ['view', 'snapshot']
};

// بيانات اعتماد المستخدمين (في الإنتاج، ستأتي من الخادم)
const validCredentials = {
    'admin': { 
        password: 'admin123', 
        role: 'admin', 
        name: 'مدير النظام الأمني',
        department: 'إدارة الأمن',
        lastLogin: null
    },
    'operator': { 
        password: 'op123', 
        role: 'operator', 
        name: 'مشغل الكاميرات',
        department: 'غرفة التحكم',
        lastLogin: null
    },
    'viewer': { 
        password: 'view123', 
        role: 'viewer', 
        name: 'مراقب النظام',
        department: 'الأمن العام',
        lastLogin: null
    }
};

// إعدادات أنواع الخرائط
const mapTypes = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        name: 'الخريطة العادية'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri',
        name: 'صور الأقمار الصناعية'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB',
        name: 'الوضع المظلم'
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap',
        name: 'خريطة التضاريس'
    },
    watercolor: {
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
        attribution: '© Stamen Design',
        name: 'الألوان المائية'
    }
};

// إعدادات النظام الافتراضية
const defaultSettings = {
    refreshRate: 30,
    streamQuality: 'medium',
    soundAlerts: true,
    emailAlerts: true,
    motionDetection: true,
    autoRecord: false,
    recordingDuration: 300, // 5 minutes
    snapshotInterval: 60, // 1 minute
    maxStorageDays: 30,
    language: 'ar'
};

// ========================================
// وظائف المصادقة والتفويض (Authentication)
// ========================================

/**
 * تسجيل دخول المستخدم
 */
function performLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('userRole').value;
    
    // التحقق من صحة البيانات
    if (!username || !password) {
        showAlert('يرجى إدخال اسم المستخدم وكلمة المرور', 'warning');
        return;
    }
    
    // التحقق من الاعتماد
    if (validCredentials[username] && 
        validCredentials[username].password === password && 
        validCredentials[username].role === role) {
        
        // تحديث بيانات المستخدم الحالي
        currentUser = {
            username: username,
            role: role,
            name: validCredentials[username].name,
            department: validCredentials[username].department,
            loginTime: new Date()
        };
        
        // تحديث آخر تسجيل دخول
        validCredentials[username].lastLogin = new Date();
        
        // تحديث واجهة المستخدم
        document.getElementById('currentUser').textContent = currentUser.name;
        document.getElementById('loginError').style.display = 'none';
        
        // إخفاء نافذة تسجيل الدخول
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        // تحديث الصلاحيات في الواجهة
        updateUIPermissions();
        
        // تسجيل عملية الدخول
        logActivity('login', `تسجيل دخول المستخدم: ${currentUser.name}`);
        
        showAlert(`مرحباً ${currentUser.name}، تم تسجيل الدخول بنجاح`, 'success');
        
        // تحديث الإحصائيات
        updateDashboardStats();
        
    } else {
        document.getElementById('loginError').style.display = 'block';
        logActivity('login_failed', `محاولة دخول فاشلة: ${username}`);
    }
}

/**
 * تسجيل خروج المستخدم
 */
function logout() {
    if (currentUser && confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        logActivity('logout', `تسجيل خروج المستخدم: ${currentUser.name}`);
        
        // إيقاف التسجيل إذا كان نشطاً
        if (isRecording) {
            stopRecording();
        }
        
        // مسح بيانات المستخدم
        currentUser = null;
        document.getElementById('currentUser').textContent = 'غير مسجل';
        
        // إعادة تعيين النموذج
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
        
        // عرض نافذة تسجيل الدخول
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        
        // إخفاء العناصر المحمية
        updateUIPermissions();
        
        showAlert('تم تسجيل الخروج بنجاح', 'info');
    }
}

/**
 * التحقق من صلاحية المستخدم
 */
function hasPermission(action) {
    if (!currentUser) return false;
    return userPermissions[currentUser.role] && userPermissions[currentUser.role].includes(action);
}

/**
 * تحديث واجهة المستخدم حسب الصلاحيات
 */
function updateUIPermissions() {
    const elements = {
        addButton: document.querySelector('button[onclick="showAddCameraModal()"]'),
        exportButton: document.querySelector('button[onclick="exportData()"]'),
        settingsButton: document.querySelector('button[onclick="showSettings()"]'),
        adminSection: document.querySelector('.admin-section')
    };
    
    // إخفاء/إظهار الأزرار حسب الصلاحيات
    if (elements.addButton) {
        elements.addButton.style.display = hasPermission('add') ? 'block' : 'none';
    }
    if (elements.exportButton) {
        elements.exportButton.style.display = hasPermission('export') ? 'block' : 'none';
    }
    if (elements.settingsButton) {
        elements.settingsButton.style.display = hasPermission('settings') ? 'block' : 'none';
    }
    if (elements.adminSection) {
        elements.adminSection.style.display = (hasPermission('add') || hasPermission('settings')) ? 'block' : 'none';
    }
}

// ========================================
// وظائف الخريطة (Map Functions)
// ========================================

/**
 * تهيئة الخريطة
 */
function initMap() {
    try {
        // إنشاء الخريطة مع التركيز على القاهرة
        map = L.map('map', {
            center: [30.0444, 31.2357],
            zoom: 16,
            zoomControl: true,
            attributionControl: true
        });

        // إضافة طبقة الخريطة الافتراضية
        currentTileLayer = L.tileLayer(mapTypes.osm.url, {
            attribution: mapTypes.osm.attribution,
            maxZoom: 19
        }).addTo(map);

        // إضافة الكاميرات إلى الخريطة
        addCamerasToMap();
        
        // إضافة مستمع للنقر على الخريطة
        map.on('click', handleMapClick);
        
        // إضافة مستمع لتغيير مستوى التكبير
        map.on('zoomend', updateMarkerSizes);
        
        logActivity('map_init', 'تم تهيئة الخريطة بنجاح');
        
    } catch (error) {
        console.error('خطأ في تهيئة الخريطة:', error);
        showAlert('خطأ في تحميل الخريطة', 'danger');
    }
}

/**
 * تغيير نوع الخريطة
 */
function changeMapType() {
    const selectedType = document.getElementById('mapTypeSelector').value;
    const mapConfig = mapTypes[selectedType];
    
    if (!mapConfig) {
        showAlert('نوع خريطة غير صالح', 'warning');
        return;
    }
    
    try {
        // إزالة الطبقة الحالية
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }
        
        // إضافة الطبقة الجديدة
        currentTileLayer = L.tileLayer(mapConfig.url, {
            attribution: mapConfig.attribution,
            maxZoom: 19
        }).addTo(map);
        
        logActivity('map_change', `تم تغيير نوع الخريطة إلى: ${mapConfig.name}`);
        
    } catch (error) {
        console.error('خطأ في تغيير نوع الخريطة:', error);
        showAlert('خطأ في تحميل نوع الخريطة المحدد', 'danger');
    }
}

/**
 * إضافة علامات الكاميرات إلى الخريطة
 */
function addCamerasToMap() {
    try {
        // مسح العلامات الموجودة
        markers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        markers = [];

        // إضافة علامة لكل كاميرا
        cameras.forEach(camera => {
            const marker = createCameraMarker(camera);
            if (marker) {
                markers.push(marker);
            }
        });
        
        logActivity('markers_update', `تم تحديث ${cameras.length} علامة كاميرا`);
        
    } catch (error) {
        console.error('خطأ في إضافة علامات الكاميرات:', error);
        showAlert('خطأ في عرض مواقع الكاميرات', 'danger');
    }
}

/**
 * إنشاء علامة كاميرا
 */
function createCameraMarker(camera) {
    try {
        // تحديد لون الأيقونة حسب الحالة
        const iconColor = camera.status === 'online' ? '#27ae60' : '#e74c3c';
        const pulseClass = camera.status === 'online' ? 'pulse-online' : 'pulse-offline';
        
        // إنشاء أيقونة مخصصة
        const icon = L.divIcon({
            html: `<div class="camera-marker ${pulseClass}">
                     <i class="fas fa-video" style="color: ${iconColor}; font-size: 18px;"></i>
                   </div>`,
            iconSize: [30, 30],
            className: 'custom-camera-icon'
        });

        // إنشاء العلامة
        const marker = L.marker([camera.lat, camera.lng], { icon: icon })
            .addTo(map)
            .bindPopup(createCameraPopup(camera));

        // إضافة مستمع للنقر
        marker.on('click', () => {
            if (hasPermission('view')) {
                viewCameraFeed(camera.id);
            } else {
                showAlert('ليس لديك صلاحية لعرض الكاميرات', 'warning');
            }
        });

        return marker;
        
    } catch (error) {
        console.error('خطأ في إنشاء علامة الكاميرا:', error);
        return null;
    }
}

/**
 * إنشاء محتوى النافذة المنبثقة للكاميرا
 */
function createCameraPopup(camera) {
    const statusText = camera.status === 'online' ? 'متصلة' : 'منقطعة';
    const statusClass = camera.status === 'online' ? 'status-online' : 'status-offline';
    const lastSeenText = formatLastSeen(camera.lastSeen);
    
    return `
        <div class="camera-popup" style="font-family: 'Cairo', sans-serif; min-width: 200px;">
            <h6 style="color: #f39c12; font-weight: 700; margin-bottom: 10px;">
                <i class="fas fa-video me-2"></i>${camera.name}
            </h6>
            <div class="popup-info">
                <p style="margin: 5px 0;">
                    <strong>الحالة:</strong> 
                    <span class="${statusClass}">${statusText}</span>
                </p>
                <p style="margin: 5px 0;">
                    <strong>المنطقة:</strong> ${getZoneName(camera.zone)}
                </p>
                <p style="margin: 5px 0;">
                    <strong>الدقة:</strong> ${camera.resolution || 'غير محدد'}
                </p>
                <p style="margin: 5px 0; font-size: 0.8em; color: #bdc3c7;">
                    آخر اتصال: ${lastSeenText}
                </p>
                <p style="margin: 10px 0 5px 0; font-size: 0.9em;">${camera.description}</p>
            </div>
            <div class="popup-actions" style="margin-top: 10px;">
                <button class="btn btn-primary btn-sm" onclick="viewCameraFeed(${camera.id})" 
                        style="font-family: 'Cairo', sans-serif; font-weight: 600;">
                    <i class="fas fa-eye me-1"></i>عرض البث
                </button>
                ${hasPermission('edit') ? `
                <button class="btn btn-warning btn-sm ms-1" onclick="editCamera(${camera.id})" 
                        style="font-family: 'Cairo', sans-serif; font-weight: 600;">
                    <i class="fas fa-edit me-1"></i>تعديل
                </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * التعامل مع النقر على الخريطة
 */
function handleMapClick(e) {
    if (currentUser && hasPermission('add')) {
        if (confirm('هل تريد إضافة كاميرا جديدة في هذا الموقع؟')) {
            document.getElementById('cameraLat').value = e.latlng.lat.toFixed(6);
            document.getElementById('cameraLng').value = e.latlng.lng.toFixed(6);
            showAddCameraModal();
        }
    }
}

/**
 * تحديث أحجام العلامات حسب مستوى التكبير
 */
function updateMarkerSizes() {
    const zoom = map.getZoom();
    const size = Math.max(20, Math.min(40, zoom * 2));
    
    // تحديث أحجام العلامات (يمكن تطبيقه لاحقاً)
}

// ========================================
// وظائف إدارة الكاميرات (Camera Management)
// ========================================

/**
 * عرض نافذة إضافة كاميرا جديدة
 */
function showAddCameraModal() {
    if (!hasPermission('add')) {
        showAlert('ليس لديك صلاحية لإضافة كاميرات', 'warning');
        return;
    }
    
    // ملء الإحداثيات بمركز الخريطة
    const center = map.getCenter();
    document.getElementById('cameraLat').value = center.lat.toFixed(6);
    document.getElementById('cameraLng').value = center.lng.toFixed(6);
    
    // مسح النموذج
    document.getElementById('addCameraForm').reset();
    document.getElementById('cameraLat').value = center.lat.toFixed(6);
    document.getElementById('cameraLng').value = center.lng.toFixed(6);
    
    const modal = new bootstrap.Modal(document.getElementById('addCameraModal'));
    modal.show();
}

/**
 * إضافة كاميرا جديدة
 */
function addCamera() {
    if (!hasPermission('add')) {
        showAlert('ليس لديك صلاحية لإضافة كاميرات', 'warning');
        return;
    }
    
    const form = document.getElementById('addCameraForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    try {
        // إنشاء كاميرا جديدة
        const newCamera = {
            id: Math.max(...cameras.map(c => c.id), 0) + 1,
            name: document.getElementById('cameraName').value.trim(),
            lat: parseFloat(document.getElementById('cameraLat').value),
            lng: parseFloat(document.getElementById('cameraLng').value),
            streamUrl: document.getElementById('cameraUrl').value.trim() || 
                      `rtsp://192.168.1.${100 + cameras.length}:554/stream1`,
            status: 'online',
            description: document.getElementById('cameraDescription').value.trim() || 'كاميرا مراقبة جديدة',
            zone: document.getElementById('cameraZone').value,
            lastSeen: new Date(),
            resolution: '1920x1080',
            fps: 30,
            addedBy: currentUser.name,
            addedAt: new Date()
        };

        // التحقق من عدم تكرار الاسم
        if (cameras.some(c => c.name === newCamera.name)) {
            showAlert('اسم الكاميرا موجود بالفعل، يرجى اختيار اسم آخر', 'warning');
            return;
        }

        // إضافة الكاميرا
        cameras.push(newCamera);
        
        // تحديث الخريطة والقائمة
        addCamerasToMap();
        updateCameraList();
        updateDashboardStats();
        
        // إغلاق النافذة وإعادة تعيين النموذج
        bootstrap.Modal.getInstance(document.getElementById('addCameraModal')).hide();
        form.reset();
        
        // تسجيل النشاط
        logActivity('camera_add', `تم إضافة كاميرا جديدة: ${newCamera.name}`);
        
        showAlert(`تم إضافة الكاميرا "${newCamera.name}" بنجاح!`, 'success');
        
    } catch (error) {
        console.error('خطأ في إضافة الكاميرا:', error);
        showAlert('حدث خطأ أثناء إضافة الكاميرا', 'danger');
    }
}

/**
 * تعديل كاميرا موجودة
 */
function editCamera(cameraId) {
    if (!hasPermission('edit')) {
        showAlert('ليس لديك صلاحية لتعديل الكاميرات', 'warning');
        return;
    }
    
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) {
        showAlert('الكاميرا غير موجودة', 'danger');
        return;
    }
    
    // ملء النموذج ببيانات الكاميرا الحالية
    document.getElementById('cameraName').value = camera.name;
    document.getElementById('cameraLat').value = camera.lat;
    document.getElementById('cameraLng').value = camera.lng;
    document.getElementById('cameraUrl').value = camera.streamUrl;
    document.getElementById('cameraDescription').value = camera.description;
    document.getElementById('cameraZone').value = camera.zone;
    
    // تغيير عنوان النافذة
    document.querySelector('#addCameraModal .modal-title').innerHTML = 
        '<i class="fas fa-edit me-2"></i>تعديل الكاميرا';
    
    // تغيير نص الزر
    const saveButton = document.querySelector('#addCameraModal button[onclick="addCamera()"]');
    saveButton.setAttribute('onclick', `updateCamera(${cameraId})`);
    saveButton.innerHTML = '<i class="fas fa-save me-1"></i>حفظ التعديلات';
    
    const modal = new bootstrap.Modal(document.getElementById('addCameraModal'));
    modal.show();
}

/**
 * تحديث بيانات كاميرا
 */
function updateCamera(cameraId) {
    if (!hasPermission('edit')) {
        showAlert('ليس لديك صلاحية لتعديل الكاميرات', 'warning');
        return;
    }
    
    const form = document.getElementById('addCameraForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        const cameraIndex = cameras.findIndex(c => c.id === cameraId);
        if (cameraIndex === -1) {
            showAlert('الكاميرا غير موجودة', 'danger');
            return;
        }
        
        // تحديث بيانات الكاميرا
        const updatedCamera = {
            ...cameras[cameraIndex],
            name: document.getElementById('cameraName').value.trim(),
            lat: parseFloat(document.getElementById('cameraLat').value),
            lng: parseFloat(document.getElementById('cameraLng').value),
            streamUrl: document.getElementById('cameraUrl').value.trim(),
            description: document.getElementById('cameraDescription').value.trim(),
            zone: document.getElementById('cameraZone').value,
            updatedBy: currentUser.name,
            updatedAt: new Date()
        };
        
        cameras[cameraIndex] = updatedCamera;
        
        // تحديث الواجهة
        addCamerasToMap();
        updateCameraList();
        
        // إغلاق النافذة وإعادة تعيين النموذج
        bootstrap.Modal.getInstance(document.getElementById('addCameraModal')).hide();
        resetAddCameraModal();
        
        logActivity('camera_update', `تم تحديث الكاميرا: ${updatedCamera.name}`);
        showAlert(`تم تحديث الكاميرا "${updatedCamera.name}" بنجاح!`, 'success');
        
    } catch (error) {
        console.error('خطأ في تحديث الكاميرا:', error);
        showAlert('حدث خطأ أثناء تحديث الكاميرا', 'danger');
    }
}

/**
 * حذف كاميرا
 */
function deleteCamera(cameraId) {
    if (!hasPermission('delete')) {
        showAlert('ليس لديك صلاحية لحذف الكاميرات', 'warning');
        return;
    }
    
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) {
        showAlert('الكاميرا غير موجودة', 'danger');
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف الكاميرا "${camera.name}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
        try {
            // إزالة الكاميرا من المصفوفة
            cameras = cameras.filter(c => c.id !== cameraId);
            
            // تحديث الواجهة
            addCamerasToMap();
            updateCameraList();
            updateDashboardStats();
            
            logActivity('camera_delete', `تم حذف الكاميرا: ${camera.name}`);
            showAlert(`تم حذف الكاميرا "${camera.name}" بنجاح`, 'success');
            
        } catch (error) {
            console.error('خطأ في حذف الكاميرا:', error);
            showAlert('حدث خطأ أثناء حذف الكاميرا', 'danger');
        }
    }
}

/**
 * إعادة تعيين نافذة إضافة الكاميرا
 */
function resetAddCameraModal() {
    // إعادة تعيين العنوان والزر
    document.querySelector('#addCameraModal .modal-title').innerHTML = 
        '<i class="fas fa-plus me-2"></i>إضافة كاميرا جديدة';
    
    const saveButton = document.querySelector('#addCameraModal button[onclick*="Camera"]');
    saveButton.setAttribute('onclick', 'addCamera()');
    saveButton.innerHTML = '<i class="fas fa-save me-1"></i>حفظ الكاميرا';
}

// ========================================
// وظائف عرض البث (Video Feed Functions)
// ========================================

/**
 * عرض بث الكاميرا
 */
function viewCameraFeed(cameraId) {
    if (!hasPermission('view')) {
        showAlert('ليس لديك صلاحية لعرض الكاميرات', 'warning');
        return;
    }
    
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) {
        showAlert('الكاميرا غير موجودة', 'danger');
        return;
    }

    currentCamera = camera;
    
    // تحديث عنوان النافذة
    document.getElementById('cameraModalTitle').innerHTML = `
        <i class="fas fa-video me-2"></i>
        ${camera.name}
        <small class="text-muted ms-2">(${camera.zone})</small>
    `;
    
    // تحديث رابط البث
    document.getElementById('streamUrl').textContent = camera.streamUrl;
    
    // إعادة تعيين حالة التسجيل
    isRecording = false;
    document.getElementById('recordingStatus').style.display = 'none';
    
    // إنشاء محتوى البث
    createVideoFeed(camera);
    
    // تحديث الطابع الزمني
    updateFeedTimestamp();
    
    // عرض النافذة
    const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
    modal.show();
    
    // تسجيل النشاط
    logActivity('camera_view', `عرض بث الكاميرا: ${camera.name}`);
}

/**
 * إنشاء محتوى البث المرئي
 */
function createVideoFeed(camera) {
    const videoContainer = document.getElementById('videoContainer');
    
    if (camera.status === 'online') {
        // محاكاة البث المباشر
        videoContainer.innerHTML = `
            <div class="video-feed-active" style="
                background: linear-gradient(45deg, #1e3c72, #2a5298); 
                position: relative; 
                height: 300px;
                border-radius: 8px;
                overflow: hidden;
            ">
                <div style="
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%); 
                    text-align: center;
                    color: white;
                ">
                    <div class="streaming-indicator" style="margin-bottom: 20px;">
                        <i class="fas fa-video fa-3x mb-3 text-success"></i>
                        <div style="font-family: 'Cairo', sans-serif; font-weight: 600; font-size: 1.1rem;">
                            البث المباشر نشط
                        </div>
                        <small class="text-light" style="font-family: 'Cairo', sans-serif;">
                            الدقة: ${camera.resolution} | معدل الإطارات: ${camera.fps} fps
                        </small>
                    </div>
                    <div class="stream-stats" style="font-size: 0.9rem; opacity: 0.8;">
                        <div>جودة الإشارة: ممتازة</div>
                        <div>زمن التأخير: 0.2 ثانية</div>
                    </div>
                </div>
                
                <!-- مؤشر البث المباشر -->
                <div style="
                    position: absolute; 
                    top: 15px; 
                    right: 15px; 
                    background: rgba(0,0,0,0.7); 
                    padding: 8px 12px; 
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <div class="live-indicator" style="
                        width: 8px; 
                        height: 8px; 
                        background: #27ae60; 
                        border-radius: 50%;
                        animation: pulse 1.5s infinite;
                    "></div>
                    <small style="color: #27ae60; font-family: 'Cairo', sans-serif; font-weight: 600;">
                        مباشر
                    </small>
                </div>
                
                <!-- معلومات الكاميرا -->
                <div style="
                    position: absolute; 
                    bottom: 15px; 
                    left: 15px; 
                    background: rgba(0,0,0,0.7); 
                    padding: 8px 12px; 
                    border-radius: 8px;
                    font-size: 0.8rem;
                ">
                    <div style="color: #f39c12; font-weight: 600;">${camera.name}</div>
                    <div style="color: #bdc3c7;">${formatDateTime(new Date())}</div>
                </div>
            </div>
        `;
    } else {
        // الكاميرا غير متصلة
        videoContainer.innerHTML = `
            <div class="video-feed-offline" style="
                background: linear-gradient(45deg, #2c3e50, #34495e); 
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed #e74c3c;
                border-radius: 8px;
            ">
                <div style="text-align: center; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle fa-4x mb-3"></i>
                    <div style="font-family: 'Cairo', sans-serif; font-weight: 600; font-size: 1.2rem; margin-bottom: 10px;">
                        الكاميرا غير متصلة
                    </div>
                    <div style="font-family: 'Cairo', sans-serif; color: #bdc3c7; margin-bottom: 15px;">
                        آخر اتصال: ${formatLastSeen(camera.lastSeen)}
                    </div>
                    <button class="btn btn-warning btn-sm" onclick="reconnectCamera(${camera.id})" 
                            style="font-family: 'Cairo', sans-serif;">
                        <i class="fas fa-sync-alt me-1"></i>
                        محاولة إعادة الاتصال
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * تحديث الطابع الزمني للبث
 */
function updateFeedTimestamp() {
    const timestampElement = document.getElementById('feedTimestamp');
    if (timestampElement) {
        timestampElement.textContent = formatDateTime(new Date());
    }
}

/**
 * تحديث البث
 */
function refreshFeed() {
    if (currentCamera) {
        createVideoFeed(currentCamera);
        updateFeedTimestamp();
        showAlert('تم تحديث البث', 'info');
        logActivity('feed_refresh', `تحديث بث الكاميرا: ${currentCamera.name}`);
    }
}

/**
 * ملء الشاشة
 */
function toggleFullscreen() {
    const videoContainer = document.getElementById('videoContainer');
    
    if (!document.fullscreenElement) {
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) {
            videoContainer.msRequestFullscreen();
        }
        logActivity('fullscreen_enter', `دخول وضع ملء الشاشة للكاميرا: ${currentCamera?.name}`);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        logActivity('fullscreen_exit', 'خروج من وضع ملء الشاشة');
    }
}

/**
 * إعادة الاتصال بالكاميرا
 */
function reconnectCamera(cameraId) {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    showAlert('جاري محاولة إعادة الاتصال...', 'info');
    
    // محاكاة إعادة الاتصال
    setTimeout(() => {
        const success = Math.random() > 0.3; // 70% نسبة نجاح
        
        if (success) {
            camera.status = 'online';
            camera.lastSeen = new Date();
            
            // تحديث الواجهة
            createVideoFeed(camera);
            addCamerasToMap();
            updateCameraList();
            updateDashboardStats();
            
            showAlert(`تم إعادة الاتصال بالكاميرا "${camera.name}" بنجاح`, 'success');
            logActivity('camera_reconnect', `إعادة اتصال ناجحة: ${camera.name}`);
        } else {
            showAlert(`فشل في إعادة الاتصال بالكاميرا "${camera.name}"`, 'danger');
            logActivity('camera_reconnect_failed', `فشل إعادة الاتصال: ${camera.name}`);
        }
    }, 2000);
}

// ========================================
// وظائف التسجيل واللقطات (Recording & Snapshots)
// ========================================

/**
 * بدء/إيقاف التسجيل
 */
function recordFeed() {
    if (!hasPermission('record')) {
        showAlert('ليس لديك صلاحية للتسجيل', 'warning');
        return;
    }
    
    if (!currentCamera) {
        showAlert('لا توجد كاميرا محددة', 'warning');
        return;
    }
    
    if (currentCamera.status !== 'online') {
        showAlert('لا يمكن التسجيل من كاميرا غير متصلة', 'warning');
        return;
    }
    
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

/**
 * بدء التسجيل
 */
function startRecording() {
    isRecording = true;
    const recordingStatus = document.getElementById('recordingStatus');
    recordingStatus.style.display = 'block';
    recordingStatus.innerHTML = `
        <i class="fas fa-circle me-1" style="animation: pulse 1s infinite;"></i>
        جاري التسجيل... <span id="recordingTimer">00:00</span>
    `;
    
    // بدء مؤقت التسجيل
    let recordingStartTime = Date.now();
    recordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        
        const timerElement = document.getElementById('recordingTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds}`;
        }
    }, 1000);
    
    // تغيير نص الزر
    const recordButton = document.querySelector('button[onclick="recordFeed()"]');
    if (recordButton) {
        recordButton.innerHTML = '<i class="fas fa-stop me-1"></i>إيقاف التسجيل';
        recordButton.className = 'btn btn-danger me-2';
    }
    
    logActivity('recording_start', `بدء تسجيل الكاميرا: ${currentCamera.name}`);
    showAlert('بدأ التسجيل بنجاح', 'success');
}

/**
 * إيقاف التسجيل
 */
function stopRecording() {
    isRecording = false;
    
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    
    const recordingStatus = document.getElementById('recordingStatus');
    recordingStatus.style.display = 'none';
    
    // إعادة تعيين الزر
    const recordButton = document.querySelector('button[onclick="recordFeed()"]');
    if (recordButton) {
        recordButton.innerHTML = '<i class="fas fa-record-vinyl me-1"></i>تسجيل';
        recordButton.className = 'btn btn-warning me-2';
    }
    
    // محاكاة حفظ التسجيل
    const timestamp = formatDateTime(new Date()).replace(/[:\s]/g, '-');
    const filename = `recording_${currentCamera.name.replace(/\s+/g, '_')}_${timestamp}.mp4`;
    
    logActivity('recording_stop', `إيقاف تسجيل الكاميرا: ${currentCamera.name}`);
    showAlert(`تم حفظ التسجيل: ${filename}`, 'info');
}

/**
 * أخذ لقطة شاشة
 */
function takeSnapshot() {
    if (!hasPermission('snapshot')) {
        showAlert('ليس لديك صلاحية لأخذ لقطات', 'warning');
        return;
    }
    
    if (!currentCamera) {
        showAlert('لا توجد كاميرا محددة', 'warning');
        return;
    }
    
    if (currentCamera.status !== 'online') {
        showAlert('لا يمكن أخذ لقطة من كاميرا غير متصلة', 'warning');
        return;
    }
    
    try {
        // إنشاء canvas لمحاكاة اللقطة
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        
        // رسم خلفية اللقطة
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(1, '#2a5298');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // إضافة معلومات الكاميرا
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(currentCamera.name, canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '32px Arial';
        ctx.fillText(formatDateTime(new Date()), canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`الدقة: ${currentCamera.resolution}`, canvas.width / 2, canvas.height / 2 + 80);
        
        // إضافة شعار أو علامة مائية
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 72px Arial';
        ctx.fillText('نظام المراقبة الأمني', canvas.width / 2, canvas.height - 100);
        
        // تحويل إلى blob وتحميل
        canvas.toBlob(blob => {
            const timestamp = formatDateTime(new Date()).replace(/[:\s]/g, '-');
            const filename = `snapshot_${currentCamera.name.replace(/\s+/g, '_')}_${timestamp}.jpg`;
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            
            logActivity('snapshot_taken', `أخذ لقطة من الكاميرا: ${currentCamera.name}`);
            showAlert(`تم حفظ اللقطة: ${filename}`, 'success');
        }, 'image/jpeg', 0.9);
        
    } catch (error) {
        console.error('خطأ في أخذ اللقطة:', error);
        showAlert('حدث خطأ أثناء أخذ اللقطة', 'danger');
    }
}

// ========================================
// وظائف الإعدادات (Settings Functions)
// ========================================

/**
 * عرض نافذة الإعدادات
 */
function showSettings() {
    if (!hasPermission('settings')) {
        showAlert('ليس لديك صلاحية للوصول للإعدادات', 'warning');
        return;
    }
    
    loadSettings();
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();
}

/**
 * تحميل الإعدادات المحفوظة
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('surveillanceSettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        
        // تحميل الإعدادات في النموذج
        document.getElementById('refreshRate').value = settings.refreshRate || 30;
        document.getElementById('streamQuality').value = settings.streamQuality || 'medium';
        document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;
        document.getElementById('emailAlerts').checked = settings.emailAlerts !== false;
        document.getElementById('motionDetection').checked = settings.motionDetection !== false;
        
        // تطبيق الإعدادات
        alertsEnabled = settings.soundAlerts !== false;
        motionDetectionEnabled = settings.motionDetection !== false;
        
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
        showAlert('خطأ في تحميل الإعدادات المحفوظة', 'warning');
    }
}

/**
 * حفظ الإعدادات
 */
function saveSettings() {
    try {
        const settings = {
            refreshRate: parseInt(document.getElementById('refreshRate').value),
            streamQuality: document.getElementById('streamQuality').value,
            soundAlerts: document.getElementById('soundAlerts').checked,
            emailAlerts: document.getElementById('emailAlerts').checked,
            motionDetection: document.getElementById('motionDetection').checked,
            savedAt: new Date().toISOString(),
            savedBy: currentUser?.name
        };
        
        // التحقق من صحة البيانات
        if (settings.refreshRate < 5 || settings.refreshRate > 300) {
            showAlert('معدل التحديث يجب أن يكون بين 5 و 300 ثانية', 'warning');
            return;
        }
        
        // حفظ في التخزين المحلي
        localStorage.setItem('surveillanceSettings', JSON.stringify(settings));
        
        // تطبيق الإعدادات
        alertsEnabled = settings.soundAlerts;
        motionDetectionEnabled = settings.motionDetection;
        
        // إغلاق النافذة
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
        
        logActivity('settings_save', 'تم حفظ إعدادات النظام');
        showAlert('تم حفظ الإعدادات بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        showAlert('حدث خطأ أثناء حفظ الإعدادات', 'danger');
    }
}

// ========================================
// وظائف الواجهة والإحصائيات (UI & Statistics)
// ========================================

/**
 * تحديث قائمة الكاميرات في الشريط الجانبي
 */
function updateCameraList() {
    const cameraList = document.getElementById('cameraList');
    if (!cameraList) return;
    
    cameraList.innerHTML = '';

    // تجميع الكاميرات حسب المنطقة
    const camerasByZone = cameras.reduce((acc, camera) => {
        if (!acc[camera.zone]) {
            acc[camera.zone] = [];
        }
        acc[camera.zone].push(camera);
        return acc;
    }, {});

    // عرض الكاميرات مجمعة حسب المنطقة
    Object.entries(camerasByZone).forEach(([zone, zoneCameras]) => {
        // عنوان المنطقة
        const zoneHeader = document.createElement('div');
        zoneHeader.className = 'zone-header';
        zoneHeader.style.cssText = `
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 8px 12px;
            margin: 15px 0 10px 0;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.9rem;
            font-family: 'Cairo', sans-serif;
        `;
        zoneHeader.innerHTML = `
            <i class="fas fa-map-marker-alt me-2"></i>
            ${getZoneName(zone)} (${zoneCameras.length})
        `;
        cameraList.appendChild(zoneHeader);

        // كاميرات المنطقة
        zoneCameras.forEach(camera => {
            const cameraItem = document.createElement('div');
            cameraItem.className = 'camera-item';
            cameraItem.onclick = () => {
                if (hasPermission('view')) {
                    viewCameraFeed(camera.id);
                } else {
                    showAlert('ليس لديك صلاحية لعرض الكاميرات', 'warning');
                }
            };
            
            const lastSeenText = formatLastSeen(camera.lastSeen);
            const statusIcon = camera.status === 'online' ? 'fa-circle' : 'fa-exclamation-circle';
            
            cameraItem.innerHTML = `
                <div class="camera-name">${camera.name}</div>
                <div class="camera-status">
                    <i class="fas ${statusIcon} status-${camera.status}"></i>
                    <span class="status-${camera.status}">
                        ${camera.status === 'online' ? 'متصلة' : 'منقطعة'}
                    </span>
                </div>
                <small class="text-muted d-block mt-1">${camera.description}</small>
                <small class="text-muted d-block">آخر اتصال: ${lastSeenText}</small>
                ${hasPermission('edit') ? `
                <div class="camera-actions mt-2">
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="event.stopPropagation(); editCamera(${camera.id})" 
                            style="font-size: 0.7rem; padding: 2px 6px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${hasPermission('delete') ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteCamera(${camera.id})" 
                            style="font-size: 0.7rem; padding: 2px 6px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
                ` : ''}
            `;
            
            cameraList.appendChild(cameraItem);
        });
    });

    // تحديث الإحصائيات
    updateDashboardStats();
}

/**
 * تحديث إحصائيات لوحة التحكم
 */
function updateDashboardStats() {
    const total = cameras.length;
    const online = cameras.filter(c => c.status === 'online').length;
    const offline = total - online;
    const uptime = total > 0 ? Math.round((online / total) * 100) : 0;

    // تحديث العناصر
    const elements = {
        totalCameras: document.getElementById('totalCameras'),
        onlineCameras: document.getElementById('onlineCameras'),
        offlineCameras: document.getElementById('offlineCameras')
    };

    if (elements.totalCameras) elements.totalCameras.textContent = total;
    if (elements.onlineCameras) elements.onlineCameras.textContent = online;
    if (elements.offlineCameras) elements.offlineCameras.textContent = offline;

    // إضافة إحصائية وقت التشغيل إذا لم تكن موجودة
    let uptimeElement = document.getElementById('systemUptime');
    if (!uptimeElement && document.querySelector('.stats-card')) {
        const statsContainer = document.querySelector('.stats-card').parentNode;
        const uptimeCard = document.createElement('div');
        uptimeCard.className = 'stats-card';
        uptimeCard.innerHTML = `
            <div class="stats-number text-info" id="systemUptime">${uptime}%</div>
            <div class="stats-label">معدل التشغيل</div>
        `;
        statsContainer.appendChild(uptimeCard);
    } else if (uptimeElement) {
        uptimeElement.textContent = `${uptime}%`;
    }
}

/**
 * تحديث الوقت الحالي
 */
function updateLastUpdate() {
    const element = document.getElementById('lastUpdate');
    if (element) {
        element.textContent = formatDateTime(new Date());
    }
}

/**
 * تصدير البيانات
 */
function exportData() {
    if (!hasPermission('export')) {
        showAlert('ليس لديك صلاحية لتصدير البيانات', 'warning');
        return;
    }
    
    try {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportedBy: currentUser.name,
                systemVersion: '1.0.0',
                totalRecords: cameras.length
            },
            statistics: {
                totalCameras: cameras.length,
                onlineCameras: cameras.filter(c => c.status === 'online').length,
                offlineCameras: cameras.filter(c => c.status === 'offline').length,
                camerasByZone: cameras.reduce((acc, camera) => {
                    acc[camera.zone] = (acc[camera.zone] || 0) + 1;
                    return acc;
                }, {})
            },
            cameras: cameras.map(camera => ({
                ...camera,
                // إزالة البيانات الحساسة إذا لزم الأمر
                streamUrl: camera.streamUrl.replace(/\/\/.*@/, '//***:***@')
            })),
            settings: JSON.parse(localStorage.getItem('surveillanceSettings') || '{}'),
            exportNotes: 'تم تصدير البيانات من نظام مراقبة الكاميرات الأمنية'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const timestamp = formatDateTime(new Date()).replace(/[:\s]/g, '-');
        const filename = `surveillance_export_${timestamp}.json`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
        
        logActivity('data_export', `تصدير البيانات: ${filename}`);
        showAlert(`تم تصدير البيانات بنجاح: ${filename}`, 'success');
        
    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
        showAlert('حدث خطأ أثناء تصدير البيانات', 'danger');
    }
}

/**
 * تحديث الخريطة
 */
function refreshMap() {
    try {
        addCamerasToMap();
        updateCameraList();
        updateDashboardStats();
        
        logActivity('map_refresh', 'تحديث الخريطة والبيانات');
        showAlert('تم تحديث الخريطة والبيانات بنجاح!', 'success');
        
    } catch (error) {
        console.error('خطأ في تحديث الخريطة:', error);
        showAlert('حدث خطأ أثناء تحديث الخريطة', 'danger');
    }
}

// ========================================
// وظائف مساعدة (Utility Functions)
// ========================================

/**
 * عرض تنبيه للمستخدم
 */
function showAlert(message, type = 'info') {
    // إنشاء عنصر التنبيه
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
        top: 20px; 
        left: 50%; 
        transform: translateX(-50%); 
        z-index: 9999; 
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-triangle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alertDiv.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertDiv.style.fontFamily = 'Cairo, sans-serif';
    alertDiv.style.fontWeight = '600';
    
    document.body.appendChild(alertDiv);
    
    // إزالة تلقائية بعد 4 ثوان
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 4000);
    
    // تشغيل صوت التنبيه إذا كان مفعلاً
    if (alertsEnabled && (type === 'danger' || type === 'warning')) {
        playAlertSound();
    }
}

/**
 * تشغيل صوت التنبيه
 */
function playAlertSound() {
    // محاكاة صوت التنبيه (في الإنتاج، يمكن استخدام ملف صوتي حقيقي)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('لا يمكن تشغيل صوت التنبيه:', error);
    }
}

/**
 * تسجيل نشاط المستخدم
 */
function logActivity(action, description) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        user: currentUser?.name || 'غير معروف',
        action: action,
        description: description,
        ip: '192.168.1.100', // في الإنتاج، سيأتي من الخادم
        userAgent: navigator.userAgent
    };
    
    // حفظ في التخزين المحلي (في الإنتاج، سيرسل للخادم)
    const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    logs.push(logEntry);
    
    // الاحتفاظ بآخر 1000 سجل فقط
    if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem('activityLogs', JSON.stringify(logs));
    
    console.log('Activity Log:', logEntry);
}

/**
 * تنسيق التاريخ والوقت
 */
function formatDateTime(date) {
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);
}

/**
 * تنسيق آخر ظهور
 */
function formatLastSeen(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
}

/**
 * الحصول على اسم المنطقة
 */
function getZoneName(zone) {
    const zoneNames = {
        entrance: 'المداخل والمخارج',
        parking: 'مواقف السيارات',
        interior: 'المناطق الداخلية',
        perimeter: 'المحيط الخارجي',
        special: 'المناطق الخاصة'
    };
    return zoneNames[zone] || zone;
}

// ========================================
// وظائف المحاكاة والتحديث التلقائي (Simulation & Auto-update)
// ========================================

/**
 * محاكاة تغيير حالة الكاميرات
 */
function simulateCameraStatusChanges() {
    setInterval(() => {
        if (cameras.length > 0 && Math.random() < 0.1) { // 10% احتمال كل 30 ثانية
            const randomCamera = cameras[Math.floor(Math.random() * cameras.length)];
            const oldStatus = randomCamera.status;
            
            // تغيير الحالة
            randomCamera.status = randomCamera.status === 'online' ? 'offline' : 'online';
            randomCamera.lastSeen = new Date();
            
            // تحديث الواجهة
            addCamerasToMap();
            updateCameraList();
            updateDashboardStats();
            
            // إشعار المستخدم
            const statusText = randomCamera.status === 'online' ? 'اتصلت' : 'انقطعت';
            const alertType = randomCamera.status === 'online' ? 'success' : 'warning';
            
            if (oldStatus !== randomCamera.status) {
                showAlert(`الكاميرا "${randomCamera.name}" ${statusText}`, alertType);
                logActivity('camera_status_change', 
                    `تغيير حالة الكاميرا ${randomCamera.name} من ${oldStatus} إلى ${randomCamera.status}`);
            }
        }
    }, 30000); // كل 30 ثانية
}

/**
 * تحديث الوقت بشكل دوري
 */
function startTimeUpdates() {
    // تحديث كل دقيقة
    setInterval(updateLastUpdate, 60000);
    
    // تحديث الطابع الزمني للبث كل ثانية
    setInterval(() => {
        if (document.getElementById('cameraModal')?.classList.contains('show')) {
            updateFeedTimestamp();
        }
    }, 1000);
}

/**
 * كشف الحركة المحاكي
 */
function simulateMotionDetection() {
    if (!motionDetectionEnabled) return;
    
    setInterval(() => {
        const onlineCameras = cameras.filter(c => c.status === 'online');
        if (onlineCameras.length > 0 && Math.random() < 0.05) { // 5% احتمال كل دقيقة
            const camera = onlineCameras[Math.floor(Math.random() * onlineCameras.length)];
            
            showAlert(`تم كشف حركة في منطقة "${camera.name}"`, 'warning');
            logActivity('motion_detected', `كشف حركة في الكاميرا: ${camera.name}`);
            
            // إضافة تأثير بصري للكاميرا
            highlightCameraOnMap(camera.id);
        }
    }, 60000); // كل دقيقة
}

/**
 * تمييز الكاميرا على الخريطة
 */
function highlightCameraOnMap(cameraId) {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    // إنشاء دائرة تمييز مؤقتة
    const highlightCircle = L.circle([camera.lat, camera.lng], {
        color: '#f39c12',
        fillColor: '#f39c12',
        fillOpacity: 0.3,
        radius: 50
    }).addTo(map);
    
    // إزالة التمييز بعد 5 ثوان
    setTimeout(() => {
        if (map.hasLayer(highlightCircle)) {
            map.removeLayer(highlightCircle);
        }
    }, 5000);
}

// ========================================
// تهيئة النظام (System Initialization)
// ========================================

/**
 * تهيئة النظام عند تحميل الصفحة
 */
function initializeSystem() {
    try {
        // عرض نافذة تسجيل الدخول
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        
        // تهيئة الخريطة
        initMap();
        
        // تحديث الواجهة
        updateCameraList();
        updateLastUpdate();
        loadSettings();
        
        // بدء التحديثات الدورية
        startTimeUpdates();
        
        // بدء المحاكاة
        setTimeout(() => {
            simulateCameraStatusChanges();
            simulateMotionDetection();
        }, 5000); // بدء بعد 5 ثوان
        
        // إضافة مستمعي الأحداث
        setupEventListeners();
        
        console.log('تم تهيئة نظام مراقبة الكاميرات بنجاح');
        
    } catch (error) {
        console.error('خطأ في تهيئة النظام:', error);
        showAlert('حدث خطأ في تهيئة النظام', 'danger');
    }
}

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    // مستمع مفتاح Enter في نموذج تسجيل الدخول
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.getElementById('loginModal')?.classList.contains('show')) {
            performLogin();
        }
    });
    
    // مستمع إغلاق نافذة إضافة الكاميرا
    const addCameraModal = document.getElementById('addCameraModal');
    if (addCameraModal) {
        addCameraModal.addEventListener('hidden.bs.modal', resetAddCameraModal);
    }
    
    // مستمع تغيير حجم النافذة
    window.addEventListener('resize', function() {
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    });
    
    // مستمع وضع ملء الشاشة
    document.addEventListener('fullscreenchange', function() {
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    });
}

// ========================================
// تشغيل النظام (System Startup)
// ========================================

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializeSystem);

// تصدير الوظائف للاستخدام العام (إذا لزم الأمر)
window.SurveillanceSystem = {
    // وظائف المصادقة
    performLogin,
    logout,
    hasPermission,
    
    // وظائف الكاميرات
    viewCameraFeed,
    addCamera,
    editCamera,
    deleteCamera,
    
    // وظائف التسجيل
    recordFeed,
    takeSnapshot,
    
    // وظائف الإعدادات
    showSettings,
    saveSettings,
    
    // وظائف الواجهة
    refreshMap,
    exportData,
    showAlert,
    
    // البيانات
    cameras,
    currentUser
};