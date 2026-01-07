// Your Firebase project configuration goes here
const firebaseConfig = {
    apiKey: "AIzaSyBSnzIj-z4shuJs6IAib6MzKv5JdE7azks",
    authDomain: "skit-qp.firebaseapp.com",
    projectId: "skit-qp",
    storageBucket: "skit-qp.firebasestorage.app",
    messagingSenderId: "1039823538914",
    appId: "1:1039823538914:web:a5d1b95e1dde98bc65ecbb",
    measurementId: "G-KEXRFLLP2Y"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    try {
        firebase.app();
    } catch (e) {
        firebase.initializeApp(firebaseConfig);
    }
}

// Global storage for saved items (declared at top level)
window.savedItems = {
    questionPapers: [],
    questionBanks: [],
    templates: []
};

// Cache management to prevent excessive API calls
window.dataCache = {
    lastLoadTime: 0,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    isLoading: false,
    loadPromise: null
};

// Show content function moved to DOMContentLoaded for better coordination

// Global filter and pagination variables
window.currentFilter = 'all';
window.currentSort = 'date-desc';
window.currentPage = 1;
window.itemsPerPage = 10;

window.firebaseAuth = firebase.auth();
window.firebaseFirestore = firebase.firestore();

// --- Global Data Model for the Question Paper ---
const currentQuestionPaper = []; // Array of main question objects
let mainQuestionCounter = 0; // Counter for display numbers (Q1, Q2, etc.)
let currentParsedQuestions = []; // Stores all questions in the left pane (parsed + manually added)

// --- Global HOD System Variables ---
let currentUserRole = 'faculty'; // Initialize role as faculty
let hodQuestionPapers = [];
let facultyList = [];
let currentHODFilter = 'all';
let currentHODTab = 'pending';
let currentHODPage = 1;
const hodItemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleDesktop = document.getElementById('sidebar-toggle-desktop');
    const sidebarToggleOpenMobile = document.getElementById('sidebar-toggle-open-mobile');
    const sidebarToggleCloseMobile = document.getElementById('sidebar-toggle-close-mobile');
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const currentViewTitle = document.getElementById('current-view-title');

    // Account Dropdown Elements
    const accountMenuBtn = document.getElementById('account-menu-btn');
    const accountDropdown = document.getElementById('account-dropdown');
    const accountInitial = document.getElementById('account-initial');
    const accountAvatarCircle = document.getElementById('account-avatar-circle');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const dropdownSignOutBtn = document.getElementById('dropdown-sign-out');
    const dropdownDeleteAccountBtn = document.getElementById('dropdown-delete-account');
    const dropdownAddAccountBtn = document.getElementById('dropdown-add-account');


    // Navigation Buttons
    const newQpBtn = document.getElementById('new-qp-btn');
    const navDashboard = document.getElementById('nav-dashboard');
    const navRequirements = document.getElementById('nav-requirements');
    const navSaved = document.getElementById('nav-saved');
    const navRecent = document.getElementById('nav-recent');
    const navSettings = document.getElementById('nav-settings');
    const navHelp = document.getElementById('nav-help');

    // Content Sections
    const welcomeContent = document.getElementById('welcome-content');
    const newQpCanvas = document.getElementById('new-qp-canvas');
    const requirementsContent = document.getElementById('requirements-content');
    const savedContent = document.getElementById('saved-content');
    const recentContent = document.getElementById('recent-content');
    const settingsContent = document.getElementById('settings-content');
    const helpContent = document.getElementById('help-content');
    const hodDashboardContent = document.getElementById('hod-dashboard-content');
    const qpEditorCanvas = document.getElementById('qp-editor-canvas');

    // Upload Form Elements
    const uploadQbForm = document.getElementById('upload-qb-form');
    const fileInput = document.getElementById('file-input');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const selectedFileName = document.getElementById('selected-file-name');
    const uploadStatus = document.getElementById('upload-status');
    const rephrasingToggle = document.getElementById('rephrasing-toggle');

    // CIE Upload Elements
    const cieTypeSelect = document.getElementById('cie-type-select');
    const standardUpload = document.getElementById('standard-upload');
    const cie1Upload = document.getElementById('cie1-upload');
    const cie2Upload = document.getElementById('cie2-upload');
    const uploadCie1Form = document.getElementById('upload-cie1-form');
    const uploadCie2Form = document.getElementById('upload-cie2-form');
    const parseCie1Btn = document.getElementById('parse-cie1-btn');
    const parseCie2Btn = document.getElementById('parse-cie2-btn');
    const parsedQuestionsList = document.getElementById('parsed-questions-list');
    const qpPreviewList = document.getElementById('qp-preview-list');
    const qpCurrentTotalMarksDisplay = document.getElementById('qp-current-total-marks'); // Renamed
    const overallMaxMarksInput = document.getElementById('overall-max-marks-input'); // New input
    const addMainQuestionBtn = document.getElementById('add-main-question-btn'); // Moved button
    const addNewQuestionBtn = document.getElementById('add-new-question-btn'); // New button for left pane

    // Modal Elements
    const questionModal = document.getElementById('question-modal');
    const closeModalBtn = questionModal.querySelector('.close-button');
    const modalTitle = document.getElementById('modal-title');
    const questionForm = document.getElementById('question-form');
    const questionTextInput = document.getElementById('question-text-input');
    const coInput = document.getElementById('co-input');
    const bloomsLevelInput = document.getElementById('blooms-level-input');
    const marksInput = document.getElementById('marks-input');
    let editingQuestionId = null; // To store the ID of the question being edited

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');

    // --- Sidebar Toggle Logic ---
    const applyInitialSidebarState = () => {
        if (window.innerWidth >= 768) { // Desktop
            document.body.classList.remove('sidebar-open-mobile');
            document.body.classList.add('sidebar-open-desktop-default');
            if (localStorage.getItem('sidebarState') === 'collapsed') {
                document.body.classList.add('sidebar-closed-desktop');
            } else {
                document.body.classList.remove('sidebar-closed-desktop');
            }
        } else { // Mobile
            document.body.classList.remove('sidebar-open-desktop-default');
            document.body.classList.remove('sidebar-closed-desktop');
            document.body.classList.remove('sidebar-open-mobile');
        }
    };

    const toggleSidebar = () => {
        if (window.innerWidth < 768) { // Mobile: Toggle overlay
            document.body.classList.toggle('sidebar-open-mobile');
        } else { // Desktop: Toggle collapse/expand (pushing)
            const isCollapsed = document.body.classList.toggle('sidebar-closed-desktop');
            localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded'); // Persist state
        }
    };

    // Event Listeners for sidebar toggles
    sidebarToggleDesktop.addEventListener('click', toggleSidebar);
    sidebarToggleOpenMobile.addEventListener('click', toggleSidebar);
    sidebarToggleCloseMobile.addEventListener('click', toggleSidebar);

    // Close sidebar if clicked outside on mobile (and if it's open)
    document.addEventListener('click', (event) => {
        if (window.innerWidth < 768 && !sidebar.contains(event.target) && !sidebarToggleOpenMobile.contains(event.target) && document.body.classList.contains('sidebar-open-mobile')) {
            toggleSidebar();
        }
    });

    // Apply initial state and listen for resize
    applyInitialSidebarState();
    window.addEventListener('resize', applyInitialSidebarState);


    // --- Account Dropdown Logic ---
    accountMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        accountDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (event) => {
        if (!accountDropdown.contains(event.target) && !accountMenuBtn.contains(event.target)) {
            accountDropdown.classList.add('hidden');
        }
    });


    // --- Content Switching Logic ---
    const showContent = (contentElement, title) => {
        const allContentSections = [welcomeContent, newQpCanvas, requirementsContent, savedContent, recentContent, settingsContent, helpContent, qpEditorCanvas, hodDashboardContent];
        allContentSections.forEach(section => {
            if (section) {
                section.classList.add('hidden');
                section.classList.remove('flex', 'flex-col', 'grid');
            }
        });

        if (contentElement) {
            contentElement.classList.remove('hidden');

            if (contentElement.id === 'qp-editor-canvas') {
                contentElement.classList.add('flex', 'flex-col');
            } else if (contentElement.id === 'recent-grid-view') {
                contentElement.classList.add('grid');
            } else if (contentElement.id.includes('modal') || contentElement.id.includes('pagination')) {
                contentElement.classList.add('flex');
            }

            if (contentElement === welcomeContent) {
                setTimeout(() => {
                    initializeCoolDashboard();
                }, 100);
            }

            if (contentElement === savedContent) {
                setTimeout(() => {
                    if (typeof initializeSavedContent === 'function') {
                        initializeSavedContent();
                    }
                }, 100);
            }

            if (contentElement === recentContent) {
                setTimeout(() => {
                    if (typeof initializeRecentContent === 'function') {
                        initializeRecentContent();
                    }
                }, 100);
            }

            if (contentElement === settingsContent) {
                setTimeout(() => {
                    if (typeof initializeSettingsContent === 'function') {
                        initializeSettingsContent();
                    }
                }, 100);
            }

            if (contentElement === helpContent) {
                setTimeout(() => {
                    if (typeof initializeHelpContent === 'function') {
                        initializeHelpContent();
                    }
                }, 100);
            }

            if (contentElement === hodDashboardContent) {
                setTimeout(() => {
                    if (typeof initializeHODDashboard === 'function') {
                        initializeHODDashboard();
                    }
                }, 100);
            }
        }
        if (currentViewTitle) {
            currentViewTitle.textContent = title;
        }

        // Export to global window so other scripts can use it
        window.showContentGlobal = (id, t) => {
            const el = document.getElementById(id);
            if (el) showContent(el, t);
        };

        if (window.innerWidth < 768 && document.body.classList.contains('sidebar-open-mobile')) {
            toggleSidebar();
        }
    };

    // --- Quick Actions Setup (Moved up for reliability) ---
    function setupQuickActions() {
        console.log('Setting up Quick Actions...');
        const quickActions = {
            'quick-new-qp': () => {
                console.log('Action: New QP');
                showContent(newQpCanvas, 'New Question Paper');
                // Reset QP data when starting a new paper
                currentQuestionPaper.length = 0;
                mainQuestionCounter = 0;
                renderQPPreview();
            },
            'quick-upload': () => {
                console.log('Action: Upload');
                showContent(newQpCanvas, 'New Question Paper');
                setTimeout(() => {
                    const uploadSection = document.querySelector('.upload-section') || document.getElementById('standard-upload');
                    if (uploadSection) uploadSection.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            },
            'quick-requirements': () => {
                console.log('Action: Requirements');
                showContent(requirementsContent, 'Requirements for QP');
                if (typeof applyGenerationDefaultsToForm === 'function') { applyGenerationDefaultsToForm(); }
            },
            'quick-saved': () => {
                console.log('Action: Saved');
                showContent(savedContent, 'Saved QPs & Banks');
                setTimeout(() => { if (typeof initializeSavedContent === 'function') initializeSavedContent(); }, 100);
            },
            'quick-recent': () => {
                console.log('Action: Recent');
                showContent(recentContent, 'Recent Generated QPs');
                setTimeout(() => { if (typeof initializeRecentContent === 'function') initializeRecentContent(); }, 100);
            },
            'quick-settings': () => {
                console.log('Action: Settings');
                showContent(settingsContent, 'Settings');
            },
            'quick-hod-dashboard': () => {
                console.log('Action: HOD');
                if (typeof switchToHODView === 'function') switchToHODView();
            }
        };

        Object.entries(quickActions).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`Attached listener to #${id}`);
                // Remove any existing listeners by cloning (to be safe if this runs twice)
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);

                newElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    newElement.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        newElement.style.transform = '';
                        handler();
                    }, 150);
                });
            } else {
                console.warn(`Quick action element #${id} not found`);
            }
        });
    }

    // Call setup immediately
    setupQuickActions();
    window.setupQuickActions = setupQuickActions;
    window.showContentGlobal = (id, t) => {
        const el = document.getElementById(id);
        if (el) showContent(el, t);
    };

    // Event Listeners for Navigation
    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            showContent(welcomeContent, 'Dashboard');
        });
    }

    const viewAllActivityBtn = document.getElementById('view-all-activity-btn');
    if (viewAllActivityBtn) {
        viewAllActivityBtn.addEventListener('click', () => {
            showContent(recentContent, 'Recent Generated QPs');
            setTimeout(() => { if (typeof initializeRecentContent === 'function') initializeRecentContent(); }, 100);
        });
    }

    newQpBtn.addEventListener('click', () => {
        showContent(newQpCanvas, 'New Question Paper');
        // Reset QP data when starting a new paper
        currentQuestionPaper.length = 0; // Clear the array
        mainQuestionCounter = 0; // Reset counter
        renderQPPreview(); // Render empty preview
    });
    navRequirements.addEventListener('click', () => { showContent(requirementsContent, 'Requirements for QP'); if (typeof applyGenerationDefaultsToForm === 'function') { applyGenerationDefaultsToForm(); } });
    navSaved.addEventListener('click', () => {
        showContent(savedContent, 'Saved QPs & Banks');
        // Initialize saved content when shown
        setTimeout(() => {
            if (typeof initializeSavedContent === 'function') {
                initializeSavedContent();
            }
        }, 100);
    });
    navRecent.addEventListener('click', () => {
        showContent(recentContent, 'Recent Generated QPs');
        // Initialize recent content when shown
        setTimeout(() => {
            if (typeof initializeRecentContent === 'function') {
                initializeRecentContent();
            }
        }, 100);
    });
    navSettings.addEventListener('click', () => showContent(settingsContent, 'Settings'));
    navHelp.addEventListener('click', () => showContent(helpContent, 'Help'));

    // HOD Dashboard Navigation
    const navHODDashboard = document.getElementById('nav-hod-dashboard');
    if (navHODDashboard) {
        navHODDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('HOD Dashboard navigation clicked');

            // Use the main switchToHODView function for consistency
            if (typeof switchToHODView === 'function') {
                switchToHODView();
            } else {
                console.error('switchToHODView function not available');
                displayMessageBox('❌ HOD Dashboard not available. Please refresh the page.', 'error');
            }
        });
    }

    // --- File Input & Clear Logic ---
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectedFileName.textContent = `Selected: ${fileInput.files[0].name}`;
            selectedFileName.classList.remove('hidden');
        } else {
            selectedFileName.textContent = '';
            selectedFileName.classList.add('hidden');
        }
        uploadStatus.textContent = ''; // Clear status on new file selection
    });

    clearFileBtn.addEventListener('click', () => {
        fileInput.value = ''; // Clear the selected file
        selectedFileName.textContent = '';
        selectedFileName.classList.add('hidden');
        uploadStatus.textContent = 'File selection cleared.';
        uploadStatus.className = 'mt-3 text-sm font-medium text-gray-600';
    });


    // --- Upload and Parse Logic ---
    if (uploadQbForm) {
        uploadQbForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            uploadStatus.textContent = 'Uploading and parsing... Please wait.';
            uploadStatus.className = 'mt-3 text-sm font-medium text-blue-600';

            const formData = new FormData(uploadQbForm);
            formData.append('enable_rephrasing', rephrasingToggle.checked);

            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox("You must be logged in to upload files.", 'error');
                uploadStatus.textContent = 'Error: Not logged in.';
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                return;
            }
            const idToken = await user.getIdToken();

            try {
                const response = await fetch('/upload_and_parse', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    uploadStatus.textContent = `Success: ${data.message} Found ${data.parsed_questions_count} questions.`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-green-600';
                    console.log('Parsed data:', data.parsed_data);

                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    // Store the parsed questions globally for the left pane
                    currentParsedQuestions = data.parsed_data;
                    populateLeftPane(currentParsedQuestions);
                    renderQPPreview();

                    // Update the latest upload info display
                    updateLatestUploadInfo(data.filename, data.parsed_questions_count);

                } else {
                    uploadStatus.textContent = `Error: ${data.error}`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                    console.error('Upload error:', data);
                }
            } catch (error) {
                console.error('Upload error:', error);
                let errorMessage = '❌ Upload failed. ';

                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage += 'Please check your internet connection and ensure the server is running.';
                } else if (error.message.includes('quota')) {
                    errorMessage += 'Database quota exceeded. Please try again later.';
                } else {
                    errorMessage += `Error: ${error.message}`;
                }

                uploadStatus.textContent = errorMessage;
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
            }
        });
    }

    // --- CIE Dropdown and Upload Section Logic ---
    if (cieTypeSelect) {
        cieTypeSelect.addEventListener('change', (event) => {
            const selectedType = event.target.value;

            // Hide all upload sections
            standardUpload.classList.add('hidden');
            cie1Upload.classList.add('hidden');
            cie2Upload.classList.add('hidden');

            // Show the selected upload section
            switch (selectedType) {
                case 'standard':
                    standardUpload.classList.remove('hidden');
                    break;
                case 'cie1':
                    cie1Upload.classList.remove('hidden');
                    break;
                case 'cie2':
                    cie2Upload.classList.remove('hidden');
                    break;
            }
        });
    }

    // --- CIE 1 Form Handler ---
    if (uploadCie1Form) {
        uploadCie1Form.addEventListener('submit', async (event) => {
            event.preventDefault();

            uploadStatus.textContent = 'Uploading and parsing CIE 1 modules... Please wait.';
            uploadStatus.className = 'mt-3 text-sm font-medium text-blue-600';

            const formData = new FormData(uploadCie1Form);
            formData.append('enable_rephrasing', document.getElementById('rephrasing-toggle-cie1').checked);
            formData.append('cie_type', 'cie1');

            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox("You must be logged in to upload files.", 'error');
                uploadStatus.textContent = 'Error: Not logged in.';
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                return;
            }
            const idToken = await user.getIdToken();

            try {
                const response = await fetch('/upload_and_parse_cie', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    uploadStatus.textContent = `Success: CIE 1 modules uploaded and parsed! Found ${data.total_questions} questions across all modules.`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-green-600';
                    console.log('Parsed CIE 1 data:', data);

                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    // Store the parsed questions globally for the left pane
                    currentParsedQuestions = data.all_questions;
                    populateLeftPane(currentParsedQuestions);
                    renderQPPreview();

                    // Update the latest upload info display
                    updateLatestUploadInfo('CIE 1 Modules', data.total_questions);

                } else {
                    uploadStatus.textContent = `Error: ${data.error || 'Failed to parse CIE 1 modules'}`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                }
            } catch (error) {
                uploadStatus.textContent = `Network error: ${error.message}. Ensure Flask server is running.`;
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                console.error('Fetch error:', error);
            }
        });
    }

    // --- CIE 2 Form Handler ---
    if (uploadCie2Form) {
        uploadCie2Form.addEventListener('submit', async (event) => {
            event.preventDefault();

            uploadStatus.textContent = 'Uploading and parsing CIE 2 modules... Please wait.';
            uploadStatus.className = 'mt-3 text-sm font-medium text-blue-600';

            const formData = new FormData(uploadCie2Form);
            formData.append('enable_rephrasing', document.getElementById('rephrasing-toggle-cie2').checked);
            formData.append('cie_type', 'cie2');

            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox("You must be logged in to upload files.", 'error');
                uploadStatus.textContent = 'Error: Not logged in.';
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                return;
            }
            const idToken = await user.getIdToken();

            try {
                const response = await fetch('/upload_and_parse_cie', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    uploadStatus.textContent = `Success: CIE 2 modules uploaded and parsed! Found ${data.total_questions} questions across all modules.`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-green-600';
                    console.log('Parsed CIE 2 data:', data);

                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    // Store the parsed questions globally for the left pane
                    currentParsedQuestions = data.all_questions;
                    populateLeftPane(currentParsedQuestions);
                    renderQPPreview();

                    // Update the latest upload info display
                    updateLatestUploadInfo('CIE 2 Modules', data.total_questions);

                } else {
                    uploadStatus.textContent = `Error: ${data.error || 'Failed to parse CIE 2 modules'}`;
                    uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                }
            } catch (error) {
                uploadStatus.textContent = `Network error: ${error.message}. Ensure Flask server is running.`;
                uploadStatus.className = 'mt-3 text-sm font-medium text-red-600';
                console.error('Fetch error:', error);
            }
        });
    }

    // Function to format question text for proper display
    function formatQuestionText(questionText) {
        if (!questionText) return '';

        // Escape HTML characters first
        let formatted = questionText.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // Check if the text contains explicit "Table:" marker
        if (formatted.includes('Table:')) {
            let parts = formatted.split('Table:');
            let result = parts[0];

            if (parts.length > 1) {
                result += '<div class="mt-2 font-semibold text-gray-700">Table Data:</div>';
                const tableData = parts[1].trim();

                result += '<div class="mt-2 overflow-x-auto"><table class="min-w-full text-sm border-collapse border border-gray-300 bg-white shadow-sm">';

                const lines = tableData.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    lines.forEach((line, index) => {
                        if (line.trim()) {
                            // Split by 2+ spaces, tabs, or pipes
                            const cells = line.trim().split(/\s{2,}|\t|\|/).filter(c => c.trim());
                            if (cells.length > 0) {
                                result += '<tr>';
                                cells.forEach(cell => {
                                    const cellClass = index === 0 ? 'bg-gray-100 font-semibold text-gray-700' : 'text-gray-600';
                                    result += `<td class="border border-gray-300 px-3 py-2 ${cellClass}">${cell}</td>`;
                                });
                                result += '</tr>';
                            }
                        }
                    });
                }
                result += '</table></div>';
            }
            return result;
        }

        // For regular text, just preserve line breaks
        return formatted.replace(/\n/g, '<br>');
    }

    // Function to populate the left pane with parsed questions
    function populateLeftPane(questions) {
        parsedQuestionsList.innerHTML = ''; // Clear previous content
        if (questions.length === 0) {
            parsedQuestionsList.innerHTML = '<p class="text-gray-500">No questions in bank. Upload a document or add new questions manually.</p>';
            return;
        }

        questions.forEach((q, index) => {
            const questionCard = document.createElement('div');
            questionCard.className = 'bg-gray-50 p-3 rounded-md shadow-sm border border-gray-200';
            questionCard.dataset.questionId = q.firestore_id || `q-${index}`;
            questionCard.dataset.questionData = JSON.stringify(q);
            questionCard.draggable = true;


            // Format question text to handle tables properly
            const formattedQuestionText = formatQuestionText(q.question_text);

            // Render images if available
            let imagesHtml = '';
            if (q.images && q.images.length > 0) {
                imagesHtml = '<div class="mt-2 flex flex-wrap gap-2">';
                q.images.forEach(img => {
                    // Ensure path points to /extracted_images/
                    let imgSrc = img;
                    if (!img.startsWith('/') && !img.startsWith('http')) {
                        imgSrc = `/extracted_images/${img}`;
                    } else if (img.startsWith('/') && !img.startsWith('/extracted_images/')) {
                        imgSrc = `/extracted_images${img}`;
                    }
                    imagesHtml += `<img src="${imgSrc}" class="max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90" onclick="window.open(this.src, '_blank')" title="Click to view full size">`;
                });
                imagesHtml += '</div>';
            }

            questionCard.innerHTML = `
                        <div class="font-semibold text-gray-800 mb-1">
                            <span class="text-blue-600">Q${q.sl_no || (index + 1)}.</span>
                            <div class="mt-1 text-sm font-normal text-gray-700 whitespace-pre-wrap">${formattedQuestionText}</div>
                            ${imagesHtml}
                        </div>
                        <div class="text-xs text-gray-600 flex flex-wrap gap-2">
                            <span>CO: <span class="font-medium">${q.co || 'N/A'}</span></span>
                            <span>Level: <span class="font-medium">${q.blooms_level || 'N/A'}</span></span>
                            <span>Marks: <span class="font-medium">${q.marks || 'N/A'}</span></span>
                            <span>Module: <span class="font-medium text-blue-600">${q.module || 'N/A'}</span></span>
                        </div>
                        <div class="mt-2 flex space-x-2">
                            <button class="add-to-qp-btn px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200">
                                Add to QP
                            </button>
                            <button class="rephrase-btn px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600 transition duration-200">
                                Rephrase
                            </button>
                            <button class="edit-bank-question-btn px-3 py-1 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-200">
                                Edit
                            </button>
                            <button class="delete-bank-question-btn px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200">
                                Delete
                            </button>
                        </div>
                    `;
            parsedQuestionsList.appendChild(questionCard);
        });

        addDragDropListeners();
        attachLeftPaneEventListeners(); // Attach listeners for new buttons

        // Maintain equal pane sizes after content changes
        if (window.maintainEqualPaneSizes) {
            window.maintainEqualPaneSizes();
        }
    }

    // --- Left Pane (Question Bank) Event Listeners ---
    function attachLeftPaneEventListeners() {
        // Add New Question button
        addNewQuestionBtn.addEventListener('click', () => {
            openQuestionModal('add');
        });

        // Edit/Delete buttons on question cards (delegated)
        parsedQuestionsList.addEventListener('click', async (e) => {
            const questionCard = e.target.closest('[data-question-id]');
            if (!questionCard) return;

            const questionId = questionCard.dataset.questionId;
            const questionData = JSON.parse(questionCard.dataset.questionData);

            if (e.target.classList.contains('edit-bank-question-btn')) {
                openQuestionModal('edit', questionId, questionData);
            } else if (e.target.classList.contains('delete-bank-question-btn')) {
                if (confirm('Are you sure you want to delete this question from your bank?')) {
                    await deleteQuestionFromBank(questionId);
                }
            } else if (e.target.classList.contains('rephrase-btn')) {
                // Rephrasing logic for left pane questions
                const rephraseButton = e.target;
                rephraseButton.disabled = true; // Disable button during rephrasing
                rephraseButton.textContent = 'Rephrasing...';

                try {
                    const user = window.firebaseAuth.currentUser;
                    if (!user) {
                        displayMessageBox("You must be logged in to rephrase questions.", 'error');
                        rephraseButton.disabled = false;
                        rephraseButton.textContent = 'Rephrase';
                        return;
                    }
                    const idToken = await user.getIdToken();

                    const response = await fetch('/rephrase_question', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            question_id: questionId,
                            original_text: questionData.question_text
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        const rephrasedText = result.rephrased_text;
                        // Update the question in Firestore
                        await updateQuestionInBank(questionId, { question_text: rephrasedText });
                        displayMessageBox("Question rephrased successfully!", 'success');
                    } else {
                        displayMessageBox(`Rephrasing failed: ${result.error || 'Unknown error'}`, 'error');
                    }
                } catch (error) {
                    displayMessageBox(`Network error during rephrasing: ${error.message}`, 'error');
                    console.error('Rephrasing fetch error:', error);
                } finally {
                    rephraseButton.disabled = false;
                    rephraseButton.textContent = 'Rephrase';
                }
            }
        });
    }

    // --- Modal Functions for Add/Edit Question ---
    function openQuestionModal(mode, qId = null, qData = {}) {
        questionForm.reset(); // Clear previous form data
        editingQuestionId = qId; // Set the ID of the question being edited

        if (mode === 'add') {
            modalTitle.textContent = 'Add New Question';
        } else if (mode === 'edit') {
            modalTitle.textContent = 'Edit Question';
            questionTextInput.value = qData.question_text || '';
            coInput.value = qData.co || '';
            bloomsLevelInput.value = qData.blooms_level || '';
            marksInput.value = qData.marks || '';
        }
        questionModal.style.display = 'flex'; // Show the modal
    }

    closeModalBtn.addEventListener('click', () => {
        questionModal.style.display = 'none'; // Hide the modal
    });

    window.addEventListener('click', (event) => {
        if (event.target == questionModal) {
            questionModal.style.display = 'none'; // Hide modal if clicked outside
        }
    });

    questionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newQData = {
            question_text: questionTextInput.value,
            co: coInput.value,
            blooms_level: bloomsLevelInput.value,
            marks: parseInt(marksInput.value) || 0,
            module: document.getElementById('module-input').value || '1'
        };

        if (editingQuestionId) {
            await updateQuestionInBank(editingQuestionId, newQData);
        } else {
            await addNewQuestionToBank(newQData);
        }
        questionModal.style.display = 'none'; // Hide modal after submission
    });

    // --- CRUD Operations for Question Bank (via Backend) ---
    async function addNewQuestionToBank(qData) {
        const user = window.firebaseAuth.currentUser;
        if (!user) { displayMessageBox("Not logged in.", 'error'); return; }
        const idToken = await user.getIdToken();

        try {
            const response = await fetch('/add_question_to_bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(qData)
            });
            const result = await response.json();
            if (response.ok) {
                displayMessageBox("Question added to bank successfully!", 'success');
                // Add the new question to our local array and re-render
                currentParsedQuestions.push(result.new_question);
                populateLeftPane(currentParsedQuestions);
            } else {
                displayMessageBox(`Failed to add question: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayMessageBox(`Network error adding question: ${error.message}`, 'error');
            console.error('Add question fetch error:', error);
        }
    }

    async function updateQuestionInBank(qId, updatedFields) {
        const user = window.firebaseAuth.currentUser;
        if (!user) { displayMessageBox("Not logged in.", 'error'); return; }
        const idToken = await user.getIdToken();

        try {
            const response = await fetch('/update_question_in_bank', {
                method: 'POST', // Or PUT/PATCH
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ question_id: qId, ...updatedFields })
            });
            const result = await response.json();
            if (response.ok) {
                displayMessageBox("Question updated successfully!", 'success');
                // Update the local array and re-render
                const index = currentParsedQuestions.findIndex(q => q.firestore_id === qId);
                if (index !== -1) {
                    currentParsedQuestions[index] = { ...currentParsedQuestions[index], ...updatedFields };
                    populateLeftPane(currentParsedQuestions);
                }
            } else {
                displayMessageBox(`Failed to update question: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayMessageBox(`Network error updating question: ${error.message}`, 'error');
            console.error('Update question fetch error:', error);
        }
    }

    async function deleteQuestionFromBank(qId) {
        const user = window.firebaseAuth.currentUser;
        if (!user) { displayMessageBox("Not logged in.", 'error'); return; }
        const idToken = await user.getIdToken();

        try {
            const response = await fetch('/delete_question_from_bank', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ question_id: qId })
            });
            const result = await response.json();
            if (response.ok) {
                displayMessageBox("Question deleted successfully!", 'success');
                // Remove from local array and re-render
                currentParsedQuestions = currentParsedQuestions.filter(q => q.firestore_id !== qId);
                populateLeftPane(currentParsedQuestions);
            } else {
                displayMessageBox(`Failed to delete question: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayMessageBox(`Network error deleting question: ${error.message}`, 'error');
            console.error('Delete question fetch error:', error);
        }
    }


    // --- Drag and Drop Logic for Left Pane ---
    let draggedItem = null;

    function addDragDropListeners() {
        const questionCards = parsedQuestionsList.querySelectorAll('[draggable="true"]');
        questionCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedItem = card;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', card.dataset.questionId);
                e.dataTransfer.setData('application/json', card.dataset.questionData);
                setTimeout(() => {
                    card.classList.add('opacity-50', 'border-dashed', 'border-blue-500');
                }, 0);
            });

            card.addEventListener('dragend', () => {
                if (draggedItem) {
                    draggedItem.classList.remove('opacity-50', 'border-dashed', 'border-blue-500');
                }
                draggedItem = null;
            });
        });
    }

    // --- QP Preview Rendering and Interaction Logic (Right Pane) ---
    function renderQPPreview() {
        // Ensure all totalMarks are valid before rendering
        ensureValidTotalMarks();

        qpPreviewList.innerHTML = ''; // Clear existing content

        if (currentQuestionPaper.length === 0) {
            qpPreviewList.innerHTML = '<p class="text-gray-500">Add main questions above or drag questions here to create new ones.</p>';
        } else {
            currentQuestionPaper.forEach((mainQ, mainQIndex) => {
                const mainQElement = document.createElement('div');
                mainQElement.className = 'qp-main-question';
                mainQElement.dataset.mainQIndex = mainQIndex;
                mainQElement.dataset.mainQId = mainQ.id;

                mainQElement.innerHTML = `
                            <div class="flex justify-between items-center mb-2">
                                <h5 class="font-bold text-lg">
                                    Question <span contenteditable="true" class="inline-block min-w-[20px] qp-main-q-number">${mainQ.displayNum}</span> 
                                    <span class="text-gray-500 text-sm">(<input type="number" value="${mainQ.maxMarks}" min="1" max="100" class="qp-main-q-marks-input w-12 text-center border rounded"> Marks)</span>
                                </h5>
                                <div class="flex items-center space-x-2">
                                    <span class="qp-total-marks-for-q text-sm font-bold ${mainQ.totalMarks === mainQ.maxMarks ? 'text-green-600' : (mainQ.totalMarks > mainQ.maxMarks ? 'text-red-600' : 'text-orange-500')}">
                                        ${mainQ.totalMarks}/${mainQ.maxMarks}
                                    </span>
                                    <button class="remove-main-btn text-red-500 hover:text-red-700 text-xl" title="Remove Main Question">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="qp-sub-questions-container space-y-2 min-h-[50px] border border-dashed border-gray-300 p-2 rounded">
                                ${mainQ.subQuestions.length === 0 ? '<p class="text-gray-500 text-sm">Drag questions here or add manually.</p>' : ''}
                            </div>
                            <button class="add-sub-question-btn mt-3 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200">
                                <i class="fas fa-plus mr-1"></i> Add Sub-question
                            </button>
                        `;
                qpPreviewList.appendChild(mainQElement);

                const subQuestionsContainer = mainQElement.querySelector('.qp-sub-questions-container');
                mainQ.subQuestions.forEach((subQ, subQIndex) => {
                    const subQElement = createSubQuestionElement(subQ, mainQIndex, subQIndex);
                    subQuestionsContainer.appendChild(subQElement);
                });
            });
        }
        updateOverallTotalMarks();
        attachQPEventListeners(); // Re-attach listeners after rendering

        // Maintain equal pane sizes after content changes
        if (window.maintainEqualPaneSizes) {
            window.maintainEqualPaneSizes();
        }
    }

    function createSubQuestionElement(qData, mainQIndex, subQIndex) {
        const subQElement = document.createElement('div');
        subQElement.className = 'qp-sub-question relative group';
        subQElement.dataset.mainQIndex = mainQIndex;
        subQElement.dataset.subQIndex = subQIndex;
        subQElement.dataset.questionId = qData.firestore_id || `temp-q-${Date.now()}-${Math.random()}`;
        subQElement.dataset.questionData = JSON.stringify(qData);


        const subPartLabel = String.fromCharCode(97 + subQIndex); // 'a', 'b', 'c'

        // Render images if available
        let imagesHtml = '';
        if (qData.images && qData.images.length > 0) {
            imagesHtml = '<div class="mt-2 flex flex-wrap gap-2 ml-6">';
            qData.images.forEach(img => {
                // Check if it's already a full path or just a filename
                let imgSrc = img;
                if (!img.startsWith('/') && !img.startsWith('http')) {
                    imgSrc = `/extracted_images/${img}`;
                } else if (img.startsWith('/') && !img.startsWith('/extracted_images/')) {
                    // If it starts with / but not the correct folder (unlikely but possible)
                    imgSrc = `/extracted_images${img}`;
                }
                imagesHtml += `<img src="${imgSrc}" class="max-h-24 rounded border border-gray-200 cursor-pointer hover:opacity-90" onclick="window.open(this.src, '_blank')">`;
            });
            imagesHtml += '</div>';
        }

        subQElement.innerHTML = `
                    <button class="remove-sub-btn"><i class="fas fa-times"></i></button>
                    <div class="flex items-start">
                        <span class="qp-question-number">${subPartLabel}.</span>
                        <span contenteditable="true" class="qp-question-text text-gray-800">${qData.question_text}</span>
                        <input type="number" value="${qData.marks}" class="qp-marks-input ml-2" min="0" max="25" data-sub-q-index="${subQIndex}">
                    </div>
                    ${imagesHtml}
                    <div class="text-xs text-gray-600 flex flex-wrap gap-2 mt-1 ml-6">
                        <span>CO: <span class="font-medium">${qData.co || 'N/A'}</span></span>
                        <span>Level: <span class="font-medium">${qData.blooms_level || 'N/A'}</span></span>
                        <span>Module: <span class="font-medium text-blue-600">${qData.module || 'N/A'}</span></span>
                        <button class="rephrase-btn px-2 py-0.5 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600 transition duration-200">
                            Rephrase
                        </button>
                    </div>
                `;
        return subQElement;
    }

    // Function to ensure all main questions have valid totalMarks
    function ensureValidTotalMarks() {
        currentQuestionPaper.forEach((mainQ, index) => {
            if (typeof mainQ.totalMarks !== 'number' || isNaN(mainQ.totalMarks)) {
                console.warn(`Fixing invalid totalMarks for main question ${index}:`, mainQ.totalMarks);

                // Recalculate from sub-questions
                let calculatedMarks = 0;
                if (mainQ.subQuestions && Array.isArray(mainQ.subQuestions)) {
                    mainQ.subQuestions.forEach(subQ => {
                        const marks = subQ.marks;
                        let parsedMarks = 0;

                        if (typeof marks === 'number' && !isNaN(marks)) {
                            parsedMarks = marks;
                        } else if (typeof marks === 'string') {
                            parsedMarks = parseInt(marks.trim()) || 0;
                        }

                        calculatedMarks += parsedMarks;
                    });
                }

                mainQ.totalMarks = calculatedMarks;
                console.log(`Fixed totalMarks for main question ${index} to:`, calculatedMarks);
            }
        });
    }

    function updateOverallTotalMarks() {
        // First ensure all totalMarks are valid
        ensureValidTotalMarks();

        let overallCurrentTotal = 0;
        currentQuestionPaper.forEach((mainQ, index) => {
            // More robust total marks calculation
            const totalMarks = mainQ.totalMarks;
            console.log(`Main question ${index}: totalMarks =`, totalMarks, 'Type:', typeof totalMarks);

            if (typeof totalMarks === 'number' && !isNaN(totalMarks)) {
                overallCurrentTotal += totalMarks;
            } else {
                console.warn('Invalid totalMarks for main question:', mainQ);
                console.warn('Attempting to fix totalMarks...');

                // Try to recalculate totalMarks from sub-questions
                let calculatedMarks = 0;
                if (mainQ.subQuestions && Array.isArray(mainQ.subQuestions)) {
                    mainQ.subQuestions.forEach(subQ => {
                        const marks = subQ.marks;
                        let parsedMarks = 0;

                        if (typeof marks === 'number' && !isNaN(marks)) {
                            parsedMarks = marks;
                        } else if (typeof marks === 'string') {
                            parsedMarks = parseInt(marks.trim()) || 0;
                        }

                        calculatedMarks += parsedMarks;
                    });
                }

                // Update the totalMarks with calculated value
                mainQ.totalMarks = calculatedMarks;
                overallCurrentTotal += calculatedMarks;
                console.log('Fixed totalMarks to:', calculatedMarks);
            }
        });

        const overallMaxAllowedMarks = parseInt(overallMaxMarksInput.value) || 0;

        qpCurrentTotalMarksDisplay.textContent = overallCurrentTotal;
        overallMaxMarksInput.value = overallMaxAllowedMarks;

        qpCurrentTotalMarksDisplay.classList.remove('text-red-600', 'text-orange-500', 'text-green-600');
        if (overallCurrentTotal === overallMaxAllowedMarks && overallMaxAllowedMarks > 0) {
            qpCurrentTotalMarksDisplay.classList.add('text-green-600');
        } else if (overallCurrentTotal > overallMaxAllowedMarks && overallMaxAllowedMarks > 0) {
            qpCurrentTotalMarksDisplay.classList.add('text-red-600');
        } else {
            qpCurrentTotalMarksDisplay.classList.add('text-orange-500');
        }
    }

    function updateMainQuestionMarks(mainQIndex) {
        const mainQ = currentQuestionPaper[mainQIndex];
        let currentMarks = 0;

        console.log('Updating marks for main question', mainQIndex);
        console.log('Sub-questions:', mainQ.subQuestions);

        mainQ.subQuestions.forEach((q, index) => {
            // More robust marks parsing
            const marks = q.marks;
            let parsedMarks = 0;

            console.log(`Sub-question ${index}: marks =`, marks, 'Type:', typeof marks);

            if (typeof marks === 'number' && !isNaN(marks)) {
                parsedMarks = marks;
            } else if (typeof marks === 'string') {
                parsedMarks = parseInt(marks.trim()) || 0;
            }

            console.log(`Sub-question ${index}: parsed marks =`, parsedMarks);
            currentMarks += parsedMarks;
        });

        console.log('Total marks for main question:', currentMarks);
        mainQ.totalMarks = currentMarks;

        const mainQElement = qpPreviewList.querySelector(`[data-main-q-index="${mainQIndex}"]`);
        if (mainQElement) {
            const marksDisplay = mainQElement.querySelector('.qp-total-marks-for-q');
            if (marksDisplay) {
                marksDisplay.textContent = `${currentMarks}/${mainQ.maxMarks}`;
                marksDisplay.classList.remove('text-green-600', 'text-red-600', 'text-orange-500');
                if (currentMarks === mainQ.maxMarks) {
                    marksDisplay.classList.add('text-green-600');
                } else if (currentMarks > mainQ.maxMarks) {
                    marksDisplay.classList.add('text-red-600');
                } else {
                    marksDisplay.classList.add('text-orange-500');
                }
            }
        }
        updateOverallTotalMarks();
    }

    // --- Event Listeners for QP Preview Pane ---
    function attachQPEventListeners() {
        // Drag over/leave/drop for main question containers
        qpPreviewList.querySelectorAll('.qp-main-question .qp-sub-questions-container').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                container.classList.add('border-blue-400', 'border-2', 'border-dashed');
            });
            container.addEventListener('dragleave', () => {
                container.classList.remove('border-blue-400', 'border-2', 'border-dashed');
            });
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('border-blue-400', 'border-2', 'border-dashed');

                const questionDataStr = e.dataTransfer.getData('application/json');
                if (questionDataStr) {
                    const questionData = JSON.parse(questionDataStr);
                    const mainQElement = e.target.closest('.qp-main-question');
                    if (mainQElement) {
                        const mainQIndex = parseInt(mainQElement.dataset.mainQIndex);
                        addQuestionToMainQuestion(questionData, mainQIndex);
                    }
                }
            });
        });

        // Add Sub-question button listeners (delegated)
        qpPreviewList.querySelectorAll('.add-sub-question-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const mainQElement = e.target.closest('.qp-main-question');
                if (mainQElement) {
                    const mainQIndex = parseInt(mainQElement.dataset.mainQIndex);
                    const blankQuestion = {
                        firestore_id: `manual-${Date.now()}-${Math.random()}`,
                        question_text: "New sub-question text...",
                        co: "N/A",
                        blooms_level: "N/A",
                        marks: 0,
                        module: "1"
                    };
                    addQuestionToMainQuestion(blankQuestion, mainQIndex);
                }
            });
        });

        // Remove Sub-question button listeners (delegated)
        qpPreviewList.addEventListener('click', (e) => {
            if (e.target.closest('.remove-sub-btn')) {
                const subQElement = e.target.closest('.qp-sub-question');
                if (subQElement) {
                    const mainQIndex = parseInt(subQElement.dataset.mainQIndex);
                    const subQIndex = parseInt(subQElement.dataset.subQIndex);
                    removeQuestionFromQP(mainQIndex, subQIndex);
                }
            }
        });

        // Remove Main Question button listeners (delegated)
        qpPreviewList.addEventListener('click', (e) => {
            if (e.target.closest('.remove-main-btn')) {
                const mainQElement = e.target.closest('.qp-main-question');
                if (mainQElement) {
                    const mainQIndex = parseInt(mainQElement.dataset.mainQIndex);
                    removeMainQuestion(mainQIndex);
                }
            }
        });

        // Content editable for main question number and sub-question text
        qpPreviewList.querySelectorAll('.qp-main-q-number[contenteditable="true"], .qp-question-text[contenteditable="true"]').forEach(element => {
            element.addEventListener('input', (e) => {
                const mainQElement = e.target.closest('.qp-main-question');
                if (!mainQElement) return;

                const mainQIndex = parseInt(mainQElement.dataset.mainQIndex);

                if (e.target.classList.contains('qp-main-q-number')) {
                    currentQuestionPaper[mainQIndex].displayNum = e.target.textContent;
                } else if (e.target.classList.contains('qp-question-text')) {
                    const subQElement = e.target.closest('.qp-sub-question');
                    const subQIndex = parseInt(subQElement.dataset.subQIndex);
                    currentQuestionPaper[mainQIndex].subQuestions[subQIndex].question_text = e.target.textContent;
                    subQElement.dataset.questionData = JSON.stringify(currentQuestionPaper[mainQIndex].subQuestions[subQIndex]);
                }
            });
        });

        // Input for marks (sub-question) and main question max marks
        qpPreviewList.querySelectorAll('.qp-marks-input, .qp-main-q-marks-input').forEach(element => {
            element.addEventListener('change', (e) => {
                const mainQElement = e.target.closest('.qp-main-question');
                if (!mainQElement) return;

                const mainQIndex = parseInt(mainQElement.dataset.mainQIndex);
                const newValue = parseInt(e.target.value) || 0;

                if (e.target.classList.contains('qp-marks-input')) { // Sub-question marks
                    const subQElement = e.target.closest('.qp-sub-question');
                    const subQIndex = parseInt(subQElement.dataset.subQIndex);
                    currentQuestionPaper[mainQIndex].subQuestions[subQIndex].marks = newValue;
                    subQElement.dataset.questionData = JSON.stringify(currentQuestionPaper[mainQIndex].subQuestions[subQIndex]);
                    updateMainQuestionMarks(mainQIndex);
                } else if (e.target.classList.contains('qp-main-q-marks-input')) { // Main question max marks
                    currentQuestionPaper[mainQIndex].maxMarks = newValue;
                    updateMainQuestionMarks(mainQIndex);
                }
            });
        });


        // Rephrase button listeners (delegated for QP items)
        qpPreviewList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('rephrase-btn')) {
                const rephraseButton = e.target;
                rephraseButton.disabled = true;
                rephraseButton.textContent = 'Rephrasing...';

                const itemToRephrase = e.target.closest('.qp-sub-question');
                if (!itemToRephrase) {
                    displayMessageBox("Could not find question text to rephrase.", 'error');
                    rephraseButton.disabled = false;
                    rephraseButton.textContent = 'Rephrase';
                    return;
                }

                const currentQuestionData = JSON.parse(itemToRephrase.dataset.questionData);
                const currentQuestionTextElement = itemToRephrase.querySelector('.qp-question-text');

                if (!currentQuestionTextElement) {
                    displayMessageBox("Could not find question text to rephrase.", 'error');
                    rephraseButton.disabled = false;
                    rephraseButton.textContent = 'Rephrase';
                    return;
                }

                displayMessageBox("Rephrasing question... Please wait.", 'info', 5000);
                try {
                    const user = window.firebaseAuth.currentUser;
                    if (!user) {
                        displayMessageBox("You must be logged in to rephrase questions.", 'error');
                        rephraseButton.disabled = false;
                        rephraseButton.textContent = 'Rephrase';
                        return;
                    }
                    const idToken = await user.getIdToken();

                    const response = await fetch('/rephrase_question', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            question_id: currentQuestionData.firestore_id,
                            original_text: currentQuestionData.question_text
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        const rephrasedText = result.rephrased_text;
                        currentQuestionTextElement.textContent = rephrasedText;
                        // Update the stored data in the data model and dataset
                        const mainQIndex = parseInt(itemToRephrase.dataset.mainQIndex);
                        const subQIndex = parseInt(itemToRephrase.dataset.subQIndex);
                        currentQuestionPaper[mainQIndex].subQuestions[subQIndex].question_text = rephrasedText;
                        itemToRephrase.dataset.questionData = JSON.stringify(currentQuestionPaper[mainQIndex].subQuestions[subQIndex]);
                        displayMessageBox("Question rephrased successfully!", 'success');
                    } else {
                        displayMessageBox(`Rephrasing failed: ${result.error || 'Unknown error'}`, 'error');
                    }
                } catch (error) {
                    displayMessageBox(`Network error during rephrasing: ${error.message}`, 'error');
                    console.error('Rephrasing fetch error:', error);
                } finally {
                    rephraseButton.disabled = false;
                    rephraseButton.textContent = 'Rephrase';
                }
            }
        });

        // Overall Max Marks Input Listener
        if (overallMaxMarksInput) {
            overallMaxMarksInput.addEventListener('change', () => {
                updateOverallTotalMarks();
            });
        }
    }


    // Function to add a question to a specific main question's sub-questions
    function addQuestionToMainQuestion(questionData, mainQIndex) {
        const mainQ = currentQuestionPaper[mainQIndex];
        if (!mainQ) {
            displayMessageBox("Please add a main question first!", 'warning');
            return;
        }
        // Assign a temporary unique ID if it's a new manual question
        if (!questionData.firestore_id) {
            questionData.firestore_id = `manual-${Date.now()}-${Math.random()}`;
        }
        mainQ.subQuestions.push(questionData);
        updateMainQuestionMarks(mainQIndex);
        renderQPPreview(); // Re-render the entire preview
    }

    // Function to remove a sub-question from the data model and re-render
    function removeQuestionFromQP(mainQIndex, subQIndex) {
        const mainQ = currentQuestionPaper[mainQIndex];
        if (subQIndex >= 0 && subQIndex < mainQ.subQuestions.length) {
            mainQ.subQuestions.splice(subQIndex, 1);
            updateMainQuestionMarks(mainQIndex);
            renderQPPreview(); // Re-render the entire preview
        }
    }

    // Function to remove an entire main question from the data model and re-render
    function removeMainQuestion(mainQIndex) {
        if (mainQIndex >= 0 && mainQIndex < currentQuestionPaper.length) {
            currentQuestionPaper.splice(mainQIndex, 1);
            // Re-index display numbers for remaining main questions
            currentQuestionPaper.forEach((q, i) => q.displayNum = i + 1);
            mainQuestionCounter = currentQuestionPaper.length; // Keep counter in sync
            renderQPPreview();
            updateOverallTotalMarks(); // Recalculate overall total
        }
    }

    // --- Add New Main Question Button Logic ---
    addMainQuestionBtn.addEventListener('click', () => {
        mainQuestionCounter++;
        const newMainQuestion = {
            id: `main-q-${Date.now()}-${Math.random()}`,
            displayNum: mainQuestionCounter,
            maxMarks: 25,
            subQuestions: [],
            totalMarks: 0
        };
        currentQuestionPaper.push(newMainQuestion);
        renderQPPreview();
        displayMessageBox(`Added Question ${newMainQuestion.displayNum} to the paper.`, 'info');
    });

    // --- Update Latest Upload Info ---
    function updateLatestUploadInfo(filename, questionCount) {
        const latestUploadText = document.getElementById('latest-upload-text');
        if (latestUploadText) {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            latestUploadText.textContent = `Latest: "${filename}" (${questionCount} questions) uploaded at ${timeString}`;
        }
    }

    // --- Pattern Selection Logic ---
    const patternSelect = document.getElementById('question-pattern-select');
    const patternDescription = document.getElementById('pattern-description');

    const patternDescriptions = {
        'standard': 'Standard: 4 questions with 3 sub-questions each, covering all modules',
        'cie1': 'CIE1: Q1 OR Q2 from Module 1 (25 marks each), Q3 & Q4 from Modules 2&3 (25 marks each)',
        'cie2': 'CIE2: Q1 OR Q2 from Module 4 (25 marks each), Q3 & Q4 from Modules 5&3 (25 marks each)'
    };

    patternSelect.addEventListener('change', (e) => {
        const selectedPattern = e.target.value;
        patternDescription.textContent = patternDescriptions[selectedPattern] || patternDescriptions['standard'];
    });

    // --- Generate Questions Button Logic ---
    const generateQuestionsBtn = document.getElementById('generate-questions-btn');
    generateQuestionsBtn.addEventListener('click', async () => {
        const user = window.firebaseAuth.currentUser;
        if (!user) {
            displayMessageBox('Please log in to generate questions.', 'error');
            return;
        }

        try {
            generateQuestionsBtn.disabled = true;
            generateQuestionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Generating...';

            // Get the selected question source option
            const questionSourceRadio = document.querySelector('input[name="question-source"]:checked');
            const useLatestUploadOnly = questionSourceRadio ? questionSourceRadio.value === 'latest' : true;

            // Get the selected pattern
            const selectedPattern = patternSelect.value || 'standard';

            const idToken = await user.getIdToken();
            const response = await fetch('/generate_question_paper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    subject: 'Auto-Generated Paper',
                    modules: ['1', '2', '3'],
                    use_latest_upload_only: useLatestUploadOnly,
                    pattern: selectedPattern
                })
            });

            const data = await response.json();
            console.log('Generation response:', data);

            if (response.ok) {
                // Clear existing question paper
                currentQuestionPaper.length = 0;
                mainQuestionCounter = 0;

                // Add generated questions to the paper
                console.log('Generated paper data:', data.questions);
                data.questions.forEach((mainQ, index) => {
                    mainQuestionCounter++;
                    const newMainQuestion = {
                        id: `main-q-${Date.now()}-${index}`,
                        displayNum: mainQuestionCounter,
                        maxMarks: 25,
                        subQuestions: mainQ.sub_questions.map(subQ => ({
                            firestore_id: `generated-${Date.now()}-${Math.random()}`,
                            question_text: subQ.text || subQ.question_text, // Handle both field names
                            marks: subQ.marks,
                            co: subQ.co || 'N/A',
                            blooms_level: subQ.blooms_level || 'L2',
                            module: subQ.module || 'N/A'
                        }))
                    };
                    currentQuestionPaper.push(newMainQuestion);
                });

                renderQPPreview();

                // Store paper ID for export functionality and approval
                if (data.paper_id) {
                    window.currentPaperId = data.paper_id;
                    console.log('Paper ID set:', data.paper_id);
                }

                // Show approval section and check status
                showApprovalSection();
                setTimeout(() => {
                    checkApprovalStatus();
                }, 1000);

                // Refresh dashboard metrics
                loadDashboardMetrics();

                // Create detailed success message with source and pattern information
                const sourceInfo = data.source_info || {};
                const sourceText = sourceInfo.latest_upload_only
                    ? `from "${sourceInfo.source_file}"`
                    : 'from all uploaded question banks';
                const questionCount = sourceInfo.total_questions_used || 'unknown';
                const patternText = selectedPattern.toUpperCase();

                displayMessageBox(
                    `✅ Successfully generated ${patternText} pattern with ${data.questions.length} main questions (25 marks each) ${sourceText}! Used ${questionCount} questions from the question bank.`,
                    'success'
                );
            } else {
                console.error('Generation failed:', data);
                let errorMessage = `Failed to generate questions: ${data.error || 'Unknown error'}`;

                if (data.error && data.error.includes('No questions found')) {
                    errorMessage += '\n\nPlease upload a question bank first using the file upload feature.';
                } else if (data.error && data.error.includes('Insufficient questions')) {
                    errorMessage += '\n\nPlease ensure your question bank has enough questions from different modules.';
                }

                displayMessageBox(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Generate questions error:', error);
            let errorMessage = '❌ Failed to generate question paper. ';

            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('quota')) {
                errorMessage += 'Database quota exceeded. Please try again later.';
            } else if (error.message.includes('No questions found')) {
                errorMessage += 'No questions found in your question bank. Please upload questions first.';
            } else {
                errorMessage += `Error: ${error.message}`;
            }

            displayMessageBox(errorMessage, 'error');
        } finally {
            generateQuestionsBtn.disabled = false;
            generateQuestionsBtn.innerHTML = '<i class="fas fa-magic mr-1"></i> Generate Questions (Auto)';
        }
    });

    // --- Approval System Functionality ---

    // Show approval section when paper is generated
    function showApprovalSection() {
        const approvalSection = document.getElementById('approval-section');
        const statusTrackingSection = document.getElementById('status-tracking-section');
        const exportButtons = document.getElementById('export-buttons');
        if (approvalSection) {
            approvalSection.classList.remove('hidden');
        }
        if (statusTrackingSection) {
            statusTrackingSection.classList.remove('hidden');
        }
        if (exportButtons) {
            exportButtons.classList.remove('hidden');
        }

        // Update status tracking
        updateStatusTracking();
    }

    // Hide approval section
    function hideApprovalSection() {
        const approvalSection = document.getElementById('approval-section');
        if (approvalSection) {
            approvalSection.classList.add('hidden');
        }
    }

    // Update approval status display
    function updateApprovalStatus(status, details = {}) {
        const statusBadge = document.getElementById('approval-status-badge');
        const submitBtn = document.getElementById('submit-approval-btn');
        const approvalDetails = document.getElementById('approval-details');

        if (!statusBadge) return;

        // Update status badge
        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-medium ';
        statusBadge.textContent = status.replace('_', ' ').toUpperCase();

        switch (status) {
            case 'not_submitted':
                statusBadge.className += 'bg-gray-100 text-gray-800';
                if (submitBtn) submitBtn.style.display = 'block';
                if (approvalDetails) approvalDetails.classList.add('hidden');
                break;
            case 'pending_approval':
                statusBadge.className += 'bg-yellow-100 text-yellow-800';
                if (submitBtn) submitBtn.style.display = 'none';
                if (approvalDetails) {
                    approvalDetails.classList.remove('hidden');
                    document.getElementById('approval-submitted-at').textContent =
                        `Submitted: ${new Date(details.submitted_at?.seconds * 1000).toLocaleString()}`;
                }
                break;
            case 'approved':
                statusBadge.className += 'bg-green-100 text-green-800';
                if (submitBtn) submitBtn.style.display = 'none';
                if (approvalDetails) {
                    approvalDetails.classList.remove('hidden');
                    document.getElementById('approval-approved-by').textContent =
                        `Approved by: ${details.approved_by}`;
                }
                break;
            case 'revision_requested':
                statusBadge.className += 'bg-red-100 text-red-800';
                if (submitBtn) submitBtn.style.display = 'block';
                if (approvalDetails) {
                    approvalDetails.classList.remove('hidden');
                    document.getElementById('approval-comments').textContent =
                        `HOD Comments: ${details.hod_comments}`;
                }
                break;
        }
    }

    // Check approval status for current paper
    async function checkApprovalStatus() {
        if (!window.currentPaperId) return;

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) return;

            const idToken = await user.getIdToken();
            const response = await fetch(`/get_approval_status?paper_id=${window.currentPaperId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateApprovalStatus(data.status, data);
            }
        } catch (error) {
            console.error('Error checking approval status:', error);
        }
    }

    // Handle submit approval button click
    function handleSubmitApprovalClick(event) {
        event.preventDefault();
        event.stopPropagation();

        console.log('Submit approval button clicked');
        console.log('Current paper ID:', window.currentPaperId);
        console.log('Available modals:', document.querySelectorAll('[id*="modal"]'));
        console.log('Approval modal element:', document.getElementById('approval-modal'));

        // Check if we have a current paper
        if (!window.currentPaperId) {
            displayMessageBox('No paper generated yet. Please generate a question paper first.', 'warning');
            return;
        }

        // Test if modal exists and show it
        const modal = document.getElementById('approval-modal');
        if (modal) {
            console.log('Modal exists, attempting to show...');
            showModal('approval-modal');
        } else {
            console.error('Approval modal not found in DOM!');
            displayMessageBox('Approval modal not found. Please refresh the page.', 'error');
        }
    }

    // Function to reattach approval event listeners
    function reattachApprovalListeners() {
        console.log('Reattaching approval event listeners...');

        const submitApprovalBtn = document.getElementById('submit-approval-btn');
        if (submitApprovalBtn) {
            // Remove existing listeners
            submitApprovalBtn.removeEventListener('click', handleSubmitApprovalClick);
            // Add new listener
            submitApprovalBtn.addEventListener('click', handleSubmitApprovalClick);
            console.log('Submit approval button listener reattached');
        } else {
            console.error('Submit approval button not found for reattachment');
        }

        const confirmApprovalBtn = document.getElementById('confirm-approval-btn');
        if (confirmApprovalBtn) {
            confirmApprovalBtn.removeEventListener('click', submitForApproval);
            confirmApprovalBtn.addEventListener('click', submitForApproval);
            console.log('Confirm approval button listener reattached');
        } else {
            console.error('Confirm approval button not found for reattachment');
        }
    }

    // --- Status Tracking Functions ---

    // Update status tracking display
    async function updateStatusTracking() {
        console.log('Updating status tracking...');

        // Update current paper status
        updateCurrentPaperStatus();

        // Load submission history
        await loadSubmissionHistory();

        // Update timeline
        updateStatusTimeline();
    }

    // Update current paper status
    function updateCurrentPaperStatus() {
        const paperNameEl = document.getElementById('current-paper-name');
        const statusBadgeEl = document.getElementById('current-paper-status-badge');

        if (window.currentPaperId) {
            paperNameEl.textContent = `Paper ID: ${window.currentPaperId}`;
            statusBadgeEl.textContent = 'Generated';
            statusBadgeEl.className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600';
        } else {
            paperNameEl.textContent = 'No paper generated';
            statusBadgeEl.textContent = 'Not Generated';
            statusBadgeEl.className = 'px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600';
        }
    }

    // Load submission history
    async function loadSubmissionHistory() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) return;

            const idToken = await user.getIdToken();
            const response = await fetch('/get_user_submissions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                displaySubmissionHistory(data.submissions || []);
            }
        } catch (error) {
            console.error('Error loading submission history:', error);
        }
    }

    // Display submission history
    function displaySubmissionHistory(submissions) {
        const historyContainer = document.getElementById('history-items');
        if (!historyContainer) return;

        if (submissions.length === 0) {
            historyContainer.innerHTML = '<div class="text-sm text-gray-500 italic">No submissions yet</div>';
            return;
        }

        historyContainer.innerHTML = submissions.map(submission => {
            const status = submission.status || 'unknown';
            const statusColors = {
                'pending': 'bg-yellow-100 text-yellow-700',
                'approved': 'bg-green-100 text-green-700',
                'rejected': 'bg-red-100 text-red-700',
                'submitted': 'bg-blue-100 text-blue-700'
            };

            const statusColor = statusColors[status] || 'bg-gray-100 text-gray-700';
            const submittedAt = new Date(submission.submitted_at).toLocaleDateString();

            return `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-700">${submission.paper_name || 'Untitled Paper'}</div>
                                <div class="text-xs text-gray-500">${submittedAt}</div>
                            </div>
                            <div class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </div>
                        </div>
                    `;
        }).join('');
    }

    // Update status timeline
    function updateStatusTimeline() {
        const timelineContainer = document.getElementById('timeline-items');
        if (!timelineContainer) return;

        const timeline = [
            { status: 'generated', label: 'Paper Generated', completed: !!window.currentPaperId },
            { status: 'submitted', label: 'Submitted for Review', completed: false },
            { status: 'reviewed', label: 'Under Review', completed: false },
            { status: 'approved', label: 'Approved', completed: false }
        ];

        timelineContainer.innerHTML = timeline.map((item, index) => {
            const isCompleted = item.completed;
            const isCurrent = index === 0 && window.currentPaperId;

            return `
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }">
                                    <i class="fas fa-${isCompleted ? 'check' : isCurrent ? 'play' : 'circle'} text-xs"></i>
                                </div>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}">
                                    ${item.label}
                                </div>
                            </div>
                        </div>
                    `;
        }).join('');
    }

    // Refresh status button handler
    document.addEventListener('DOMContentLoaded', () => {
        const refreshBtn = document.getElementById('refresh-status-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', updateStatusTracking);
        }
    });

    // --- Dashboard Metrics Functions ---

    // Load dashboard metrics
    async function loadDashboardMetrics() {
        console.log('Loading dashboard metrics...');

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                console.log('No user logged in, showing default metrics');
                updateDashboardMetrics({
                    total_questions: 0,
                    papers_generated: 0,
                    saved_templates: 0,
                    success_rate: 98,
                    questions_trend: 0,
                    papers_trend: 0
                });
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/get_dashboard_metrics', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Dashboard metrics loaded:', data);
                updateDashboardMetrics(data);
            } else {
                console.error('Failed to load dashboard metrics:', response.status, response.statusText);
                // Show default metrics on error
                updateDashboardMetrics({
                    total_questions: 0,
                    papers_generated: 0,
                    saved_templates: 0,
                    success_rate: 98,
                    questions_trend: 0,
                    papers_trend: 0
                });
            }
        } catch (error) {
            console.error('Error loading dashboard metrics:', error);
            // Show default metrics on error
            updateDashboardMetrics({
                total_questions: 0,
                papers_generated: 0,
                saved_templates: 0,
                success_rate: 98,
                questions_trend: 0,
                papers_trend: 0
            });
        }
    }

    // Update dashboard metrics display
    function updateDashboardMetrics(data) {
        console.log('Updating dashboard metrics with data:', data);

        // Use animateCounter for smooth updates if available
        const hasAnimator = typeof animateCounter === 'function';

        // Update Total Questions
        const questionsCount = document.getElementById('total-questions-count');
        if (questionsCount) {
            if (hasAnimator) {
                animateCounter('total-questions-count', data.total_questions || 0);
            } else {
                questionsCount.textContent = data.total_questions || 0;
            }
        }

        // Update Papers Generated
        const papersCount = document.getElementById('generated-papers-count');
        if (papersCount) {
            if (hasAnimator) {
                animateCounter('generated-papers-count', data.papers_generated || 0);
            } else {
                papersCount.textContent = data.papers_generated || 0;
            }
        }

        // Update Saved Templates
        const templatesCount = document.getElementById('saved-templates-count');
        if (templatesCount) {
            if (hasAnimator) {
                animateCounter('saved-templates-count', data.saved_templates || 0);
            } else {
                templatesCount.textContent = data.saved_templates || 0;
            }
        }

        // Update Success Rate
        const successRate = document.querySelector('#stat-success .text-3xl.font-bold');
        if (successRate) {
            successRate.textContent = `${data.success_rate || 98}%`;
        }

        // Update trend indicators
        updateTrendIndicators(data);
    }

    // Update trend indicators
    function updateTrendIndicators(data) {
        // Questions trend
        const questionsTrend = document.getElementById('questions-trend');
        if (questionsTrend && data.questions_trend) {
            questionsTrend.textContent = `${data.questions_trend > 0 ? '+' : ''}${data.questions_trend}% this week`;
        }

        // Papers trend
        const papersTrend = document.getElementById('papers-trend');
        if (papersTrend && data.papers_trend) {
            papersTrend.textContent = `${data.papers_trend > 0 ? '+' : ''}${data.papers_trend}% this month`;
        }
    }

    // Helper to format timestamps as "time ago"
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

        const months = Math.floor(days / 30);
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    }

    // Load recent activity feed
    async function loadRecentActivity() {
        console.log('Loading recent activity...');
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) return;

            const idToken = await user.getIdToken();
            const response = await fetch('/get_recent_activity', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const activities = await response.json();
                console.log('Recent activity loaded:', activities);

                if (activities.length === 0) {
                    activityList.innerHTML = `
                        <div class="text-center py-4 text-gray-500 italic">
                            No recent activity found
                        </div>
                    `;
                    return;
                }

                activityList.innerHTML = activities.map((activity, index) => `
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200" 
                         style="opacity: 0; transform: translateX(30px); transition: all 0.4s ease-out; transition-delay: ${1200 + (index * 200)}ms;">
                        <div class="${activity.color} rounded-full p-2">
                            <i class="${activity.icon} text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium text-gray-800">${activity.title}</p>
                            <p class="text-gray-500 text-sm">${formatTimeAgo(activity.timestamp)}</p>
                        </div>
                        <span class="${activity.badge_color} text-xs px-2 py-1 rounded-full">${activity.status}</span>
                    </div>
                `).join('');

                // Trigger entrance animation for the new elements
                setTimeout(() => {
                    const items = activityList.querySelectorAll('div[style*="opacity: 0"]');
                    items.forEach(item => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateX(0)';
                    });
                }, 100);

            } else {
                console.error('Failed to load recent activity:', response.status);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    // Load dashboard metrics on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Load metrics after a short delay to ensure Firebase is ready
        setTimeout(loadDashboardMetrics, 1000);
    });

    // Make functions globally available
    window.reattachApprovalListeners = reattachApprovalListeners;
    window.handleSubmitApprovalClick = handleSubmitApprovalClick;
    window.submitForApproval = submitForApproval;
    window.updateStatusTracking = updateStatusTracking;
    window.loadDashboardMetrics = loadDashboardMetrics;
    window.loadRecentActivity = loadRecentActivity;

    // Test function for debugging
    window.testApprovalButton = function () {
        console.log('Testing approval button...');
        const btn = document.getElementById('confirm-approval-btn');
        console.log('Button found:', btn);
        if (btn) {
            console.log('Button clickable:', !btn.disabled);
            console.log('Button visible:', btn.offsetParent !== null);
            console.log('Button styles:', window.getComputedStyle(btn));

            // Test direct click
            console.log('Testing direct click...');
            btn.click();
        }
        return btn;
    };

    // Test function to manually trigger submission
    window.testApprovalSubmission = function () {
        console.log('=== MANUAL APPROVAL SUBMISSION TEST ===');
        console.log('Current paper ID:', window.currentPaperId);
        console.log('Firebase user:', window.firebaseAuth.currentUser);
        submitForApproval();
    };

    // Cache management functions
    window.clearDataCache = function () {
        window.dataCache.lastLoadTime = 0;
        window.dataCache.isLoading = false;
        window.dataCache.loadPromise = null;
        console.log('Data cache cleared');
    };

    window.forceRefreshData = function () {
        console.log('Force refreshing data...');
        window.clearDataCache();
        loadSavedItems(true);
    };

    // Submit for approval
    // Submit for approval
    async function submitForApproval() {
        console.log('=== SUBMIT FOR APPROVAL FUNCTION CALLED ===');
        console.log('Submit for approval called, currentPaperId:', window.currentPaperId);
        console.log('Firebase user:', window.firebaseAuth.currentUser);

        const btn = document.getElementById('confirm-approval-btn');
        const originalText = btn.innerHTML;

        if (!window.currentPaperId) {
            console.log('No current paper ID, showing warning');
            displayMessageBox('No paper generated yet. Please generate a question paper first.', 'warning');
            return;
        }

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox('Please log in to submit for approval.', 'error');
                return;
            }

            // Disable button and show loading
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
            }

            const comments = document.getElementById('approval-comments').value;
            const idToken = await user.getIdToken();

            console.log('Submitting for approval with paper_id:', window.currentPaperId);

            const response = await fetch('/submit_for_approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    paper_id: window.currentPaperId,
                    comments: comments
                })
            });

            const data = await response.json();
            console.log('Approval submission response:', data);

            if (response.ok) {
                displayMessageBox(data.message, 'success');
                closeModal('approval-modal');
                updateApprovalStatus('pending_approval', { submitted_at: { seconds: Date.now() / 1000 } });

                // Update status tracking
                updateStatusTracking();

                // Refresh dashboard metrics
                loadDashboardMetrics();
            } else {
                console.error('Approval submission failed:', data);
                displayMessageBox(data.error || 'Failed to submit for approval', 'error');
            }
        } catch (error) {
            console.error('Error submitting for approval:', error);
            displayMessageBox('Failed to submit for approval. Please try again.', 'error');
        } finally {
            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }

    // Event listeners for approval system
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Setting up approval event listeners...');

        // Submit for approval button
        const submitApprovalBtn = document.getElementById('submit-approval-btn');
        console.log('Submit approval button found:', submitApprovalBtn);

        if (submitApprovalBtn) {
            // Remove any existing event listeners
            submitApprovalBtn.removeEventListener('click', handleSubmitApprovalClick);

            // Add new event listener
            submitApprovalBtn.addEventListener('click', handleSubmitApprovalClick);
            console.log('Event listener attached to submit approval button');
        } else {
            console.error('Submit approval button not found!');
            // Try to find it again after a delay
            setTimeout(() => {
                const retryBtn = document.getElementById('submit-approval-btn');
                if (retryBtn) {
                    console.log('Found submit approval button on retry, attaching listener');
                    retryBtn.addEventListener('click', handleSubmitApprovalClick);
                } else {
                    console.error('Still cannot find submit approval button after retry');
                }
            }, 1000);
        }

        // Confirm approval submission
        const confirmApprovalBtn = document.getElementById('confirm-approval-btn');
        console.log('Confirm approval button found:', confirmApprovalBtn);
        if (confirmApprovalBtn) {
            confirmApprovalBtn.addEventListener('click', function (event) {
                console.log('=== CONFIRM APPROVAL BUTTON CLICKED ===');
                console.log('Event:', event);
                console.log('Button element:', this);
                submitForApproval();
            });
            console.log('Event listener attached to confirm approval button');
        } else {
            console.error('Confirm approval button not found!');
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-pdf-btn');

        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', async () => {
                if (!window.currentPaperId) {
                    displayMessageBox('No paper generated yet. Please generate a question paper first.', 'warning');
                    return;
                }

                try {
                    const user = window.firebaseAuth.currentUser;
                    if (!user) {
                        displayMessageBox('Please log in to export.', 'error');
                        return;
                    }

                    const idToken = await user.getIdToken();
                    const response = await fetch('/export_question_paper', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            paper_id: window.currentPaperId,
                            format: 'pdf'
                        })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        displayMessageBox('PDF exported successfully!', 'success');
                        // Here you could trigger a download
                    } else {
                        displayMessageBox(data.error || 'Failed to export PDF', 'error');
                    }
                } catch (error) {
                    console.error('Error exporting PDF:', error);
                    displayMessageBox('Failed to export PDF. Please try again.', 'error');
                }
            });
        }
    });

    // --- Generate Final Document Function (PDF Only) ---
    const generateFinalDocument = async (format = 'pdf') => {
        // Force format to pdf
        format = 'pdf';

        if (currentQuestionPaper.length === 0) {
            displayMessageBox('Please add questions to the question paper before generating.', 'warning');
            return;
        }

        const user = window.firebaseAuth.currentUser;
        if (!user) {
            displayMessageBox('Please log in to generate the document.', 'error');
            return;
        }

        const btn = document.getElementById('generate-final-pdf-btn');
        const originalText = '<i class="fas fa-file-pdf mr-1"></i> Generate PDF';
        const loadingText = `<i class="fas fa-spinner fa-spin mr-1"></i> Generating PDF...`;
        const fileName = `Generated_Question_Paper.pdf`;

        try {
            btn.disabled = true;
            btn.innerHTML = loadingText;

            const idToken = await user.getIdToken();

            // Prepare metadata
            const requirements = getCurrentRequirements();
            const metadata = {
                dept: requirements.department || 'CSE', // Fallback? or leave empty
                sem: requirements.semester || '',
                div: 'A', // Default or add field if needed
                course: requirements.subject || '', // Subject name
                elective: requirements.elective || '', // Add elective field if in form, else empty
                date: new Date().toISOString().split('T')[0],
                time: requirements.duration || '3 Hrs',
                code: requirements.courseCode || ''
            };

            // Calculate total marks
            const totalMarks = currentQuestionPaper.reduce((sum, mainQ) => sum + (mainQ.maxMarks || 25), 0);

            const response = await fetch('/generate_final_document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    question_paper_data: currentQuestionPaper,
                    overall_max_marks: totalMarks,
                    metadata: metadata,
                    format: 'pdf'
                })
            });

            if (response.ok) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Add to recent QPs after successful generation
                addGeneratedPaperToRecent('pdf', fileName);

                displayMessageBox(`Question paper PDF generated and downloaded successfully!`, 'success');
            } else {
                const errorData = await response.json();
                displayMessageBox(`Failed to generate PDF: ${errorData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayMessageBox(`Network error: ${error.message}`, 'error');
            console.error(`Generate final PDF error:`, error);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;

        }
    };


    // --- Generate Final PDF Button Logic ---
    const generateFinalPdfBtn = document.getElementById('generate-final-pdf-btn');
    generateFinalPdfBtn.addEventListener('click', () => generateFinalDocument('pdf'));

    // --- Save Question Paper Button Logic ---
    const saveQuestionPaperBtn = document.getElementById('save-question-paper-btn');
    saveQuestionPaperBtn.addEventListener('click', () => saveCurrentQuestionPaper());



    // --- Save Current Question Paper Function ---
    const saveCurrentQuestionPaper = async () => {
        if (currentQuestionPaper.length === 0) {
            displayMessageBox('Please add questions to the question paper before saving.', 'warning');
            return;
        }

        // Get current requirements for metadata
        const requirements = getCurrentRequirements();

        // Create a unique ID for this question paper
        const qpId = generateId();
        const timestamp = new Date().toISOString();

        // Calculate total marks
        const totalMarks = currentQuestionPaper.reduce((sum, mainQ) => sum + (mainQ.maxMarks || 25), 0);

        // Create question paper object
        const questionPaperData = {
            id: qpId,
            name: requirements.subject ? `${requirements.subject} - Question Paper` : 'Untitled Question Paper',
            subject: requirements.subject || 'Unknown Subject',
            courseCode: requirements.courseCode || '',
            department: requirements.department || '',
            semester: requirements.semester || '',
            examType: requirements.examType || 'Regular',
            duration: requirements.duration || '3 hours',
            maxMarks: totalMarks,
            createdDate: timestamp,
            lastModified: timestamp,
            questions: JSON.parse(JSON.stringify(currentQuestionPaper)), // Deep copy
            metadata: {
                totalQuestions: currentQuestionPaper.length,
                totalMarks: totalMarks,
                questionDistribution: getQuestionDistribution(),
                bloomsDistribution: getBloomsDistribution(),
                moduleDistribution: getModuleDistribution()
            },
            status: 'draft',
            tags: generateTags(requirements)
        };

        try {
            // Save to Firestore via backend
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox('Please log in to save question papers.', 'error');
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/save_question_paper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(questionPaperData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Paper saved successfully:', data);

                // Also save to localStorage as backup
                const savedQPs = JSON.parse(localStorage.getItem('saved-question-papers') || '[]');
                savedQPs.unshift(questionPaperData);
                localStorage.setItem('saved-question-papers', JSON.stringify(savedQPs));

                // Add to recent QPs
                addToRecentQPs(questionPaperData);

                // Update UI
                displayMessageBox(`✅ Question paper "${questionPaperData.name}" saved successfully!`, 'success');
            } else {
                throw new Error(data.error || 'Failed to save to server');
            }

            // Update save button to show saved state
            const saveBtn = document.getElementById('save-question-paper-btn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Saved!';
                saveBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                saveBtn.classList.add('bg-green-500');

                // Reset button after 3 seconds
                setTimeout(() => {
                    saveBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Save Question Paper';
                    saveBtn.classList.remove('bg-green-500');
                    saveBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                }, 3000);
            }

            // Force refresh both saved and recent content (regardless of visibility)
            setTimeout(() => {
                // Refresh saved content
                if (typeof loadSavedItems === 'function') {
                    loadSavedItems();
                    if (typeof updateSavedStatistics === 'function') updateSavedStatistics();
                    if (typeof renderSavedItems === 'function') renderSavedItems();
                }

                // Refresh recent content
                if (typeof loadRecentQPs === 'function') {
                    loadRecentQPs();
                    if (typeof updateRecentStatistics === 'function') updateRecentStatistics();
                    if (typeof renderRecentQPs === 'function') renderRecentQPs();
                }

            }, 100);

        } catch (error) {
            console.error('Error saving question paper:', error);
            let errorMessage = '❌ Failed to save question paper. ';

            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('quota')) {
                errorMessage += 'Database quota exceeded. Please try again later.';
            } else {
                errorMessage += 'Please try again.';
            }

            displayMessageBox(errorMessage, 'error');
        }
    };

    // Helper function to get current requirements
    const getCurrentRequirements = () => {
        return {
            subject: document.getElementById('req-subject')?.value || '',
            courseCode: document.getElementById('req-subject-code')?.value || '',
            department: document.getElementById('req-department')?.value || '',
            semester: document.getElementById('req-semester')?.value || '',
            examType: document.getElementById('req-exam-type')?.value || 'Regular',
            duration: document.getElementById('req-duration')?.value || '3 hours',
            maxMarks: document.getElementById('req-total-marks')?.value || '100',
            elective: document.getElementById('req-elective')?.value || 'No'
        };
    };

    // Helper function to get question distribution
    const getQuestionDistribution = () => {
        const distribution = {};
        currentQuestionPaper.forEach((mainQ, index) => {
            distribution[`Q${index + 1}`] = {
                subQuestions: mainQ.subQuestions ? mainQ.subQuestions.length : 0,
                totalMarks: mainQ.maxMarks || 25
            };
        });
        return distribution;
    };

    // Helper function to get Bloom's taxonomy distribution
    const getBloomsDistribution = () => {
        const distribution = {};
        currentQuestionPaper.forEach(mainQ => {
            if (mainQ.subQuestions) {
                mainQ.subQuestions.forEach(subQ => {
                    const blooms = subQ.blooms_level || 'Unknown';
                    distribution[blooms] = (distribution[blooms] || 0) + 1;
                });
            }
        });
        return distribution;
    };

    // Helper function to get module distribution
    const getModuleDistribution = () => {
        const distribution = {};
        currentQuestionPaper.forEach(mainQ => {
            if (mainQ.subQuestions) {
                mainQ.subQuestions.forEach(subQ => {
                    const module = subQ.module || 'Unknown';
                    distribution[`Module ${module}`] = (distribution[`Module ${module}`] || 0) + 1;
                });
            }
        });
        return distribution;
    };

    // Helper function to generate tags
    const generateTags = (requirements) => {
        const tags = [];
        if (requirements.subject) tags.push(requirements.subject);
        if (requirements.department) tags.push(requirements.department);
        if (requirements.semester) tags.push(`Sem ${requirements.semester}`);
        if (requirements.examType) tags.push(requirements.examType);
        return tags;
    };

    // Helper function to add to recent QPs
    const addToRecentQPs = (questionPaperData) => {
        const storedRecentQPs = JSON.parse(localStorage.getItem('recent-generated-qps') || '[]');

        const recentQP = {
            id: questionPaperData.id,
            name: questionPaperData.name,
            subject: questionPaperData.subject,
            courseCode: questionPaperData.courseCode,
            department: questionPaperData.department,
            generatedDate: questionPaperData.createdDate,
            totalMarks: questionPaperData.maxMarks,
            totalQuestions: questionPaperData.questions.length,
            status: 'saved',
            type: 'manual',
            downloadCount: 0,
            size: Math.round(JSON.stringify(questionPaperData).length / 1024 * 100) / 100, // KB
            tags: questionPaperData.tags || []
        };

        storedRecentQPs.unshift(recentQP);

        // Keep only last 50 recent QPs
        if (storedRecentQPs.length > 50) {
            storedRecentQPs.splice(50);
        }

        localStorage.setItem('recent-generated-qps', JSON.stringify(storedRecentQPs));

        // Update the global recentQPs array as well
        window.recentQPs = storedRecentQPs;
    };

    // Helper function to add generated papers to recent QPs
    const addGeneratedPaperToRecent = (format, fileName) => {
        const requirements = getCurrentRequirements();
        const timestamp = new Date().toISOString();
        const totalMarks = currentQuestionPaper.reduce((sum, mainQ) => sum + (mainQ.maxMarks || 25), 0);

        const recentQP = {
            id: generateId(),
            name: requirements.subject ? `${requirements.subject} - ${format.toUpperCase()}` : fileName,
            subject: requirements.subject || 'Unknown Subject',
            courseCode: requirements.courseCode || '',
            department: requirements.department || '',
            generatedDate: timestamp,
            totalMarks: totalMarks,
            totalQuestions: currentQuestionPaper.length,
            status: 'generated',
            type: 'generated',
            format: format.toUpperCase(),
            downloadCount: 1, // Already downloaded
            size: Math.round(JSON.stringify(currentQuestionPaper).length / 1024 * 100) / 100, // KB
            tags: generateTags(requirements),
            fileName: fileName
        };

        const recentQPs = JSON.parse(localStorage.getItem('recent-generated-qps') || '[]');
        recentQPs.unshift(recentQP);

        // Keep only last 50 recent QPs
        if (recentQPs.length > 50) {
            recentQPs.splice(50);
        }

        localStorage.setItem('recent-generated-qps', JSON.stringify(recentQPs));

        // Update the global recentQPs array as well
        window.recentQPs = recentQPs;

        // Update recent content if it's currently visible
        if (recentContent && !recentContent.classList.contains('hidden')) {
            loadRecentQPs();
            updateRecentStatistics();
            renderRecentQPs();
        }
    };

    // --- "Add to QP" button on left pane questions ---
    parsedQuestionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-qp-btn')) {
            const questionCard = e.target.closest('[data-question-data]');
            if (questionCard) {
                const questionData = JSON.parse(questionCard.dataset.questionData);

                // Debug: Log the question data to see what's being passed
                console.log('Adding question to QP:', questionData);
                console.log('Question marks:', questionData.marks, 'Type:', typeof questionData.marks);

                // For now, add to the first main question.
                // Later, we can add a modal to ask where to place it.
                if (currentQuestionPaper.length === 0) {
                    displayMessageBox("Please add a main question first!", 'warning');
                } else {
                    addQuestionToMainQuestion(questionData, 0); // Add to first main question (index 0)
                    displayMessageBox(`Question added to Question 1.`, 'info');
                }
            }
        }
    });


    // --- Fetch Protected Data (for example purposes) ---
    const fetchProtectedData = async () => {
        const user = window.firebaseAuth.currentUser;
        if (!user) { return; }

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('http://127.0.0.1:5000/protected_data', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await response.json();
            if (response.ok) { console.log('Protected data fetched:', data); }
            else { console.error('Failed to fetch protected data:', data.message || 'Unknown error'); }
        } catch (error) {
            console.error('Network or server error fetching protected data:', error);
        }
    };


    // --- Logout Functionality ---
    dropdownSignOutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            await window.firebaseAuth.signOut();
            console.log('User signed out.');
            displayMessageBox('You have been logged out.', 'success');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (error) {
            console.error('Error signing out:', error);
            displayMessageBox('Failed to log out. Please try again.', 'error');
        }
    });

    // --- Placeholder for Delete Account / Add Account ---
    dropdownDeleteAccountBtn.addEventListener('click', (event) => { event.preventDefault(); displayMessageBox('Delete Account functionality is a placeholder. This requires careful implementation!', 'info'); });

    // --- Profile Settings Modal Logic ---
    const profileSettingsModal = document.getElementById('profile-settings-modal');
    const dropdownProfileSettingsBtn = document.getElementById('dropdown-profile-settings');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    if (dropdownProfileSettingsBtn) {
        dropdownProfileSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Populate fields
            const user = window.firebaseAuth.currentUser;
            if (user) {
                document.getElementById('profile-name').value = user.displayName || '';
                document.getElementById('profile-email').value = user.email || '';
                document.getElementById('profile-dept').value = document.getElementById('user-department').textContent || '';
                profileSettingsModal.style.display = 'block';
                // Close dropdown
                document.getElementById('account-dropdown').classList.add('hidden');
            }
        });
    }

    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', () => {
            profileSettingsModal.style.display = 'none';
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('profile-name').value;
            const user = window.firebaseAuth.currentUser;

            if (user && newName) {
                try {
                    await user.updateProfile({ displayName: newName });
                    document.getElementById('dropdown-username').textContent = newName;
                    displayMessageBox('Profile updated successfully!', 'success');
                    profileSettingsModal.style.display = 'none';
                } catch (error) {
                    console.error("Error updating profile:", error);
                    displayMessageBox('Failed to update profile: ' + error.message, 'error');
                }
            }
        });
    }

    // --- Account Settings Modal Logic ---
    const accountSettingsModal = document.getElementById('account-settings-modal');
    const dropdownAccountSettingsBtn = document.getElementById('dropdown-account-settings');
    const closeAccountModalBtn = document.getElementById('close-account-modal-btn');
    const updatePasswordBtn = document.getElementById('update-password-btn');

    if (dropdownAccountSettingsBtn) {
        dropdownAccountSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            accountSettingsModal.style.display = 'block';
            // Close dropdown
            document.getElementById('account-dropdown').classList.add('hidden');
        });
    }

    if (closeAccountModalBtn) {
        closeAccountModalBtn.addEventListener('click', () => {
            accountSettingsModal.style.display = 'none';
        });
    }

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                displayMessageBox('Passwords do not match!', 'error');
                return;
            }

            if (newPassword.length < 6) {
                displayMessageBox('Password should be at least 6 characters.', 'error');
                return;
            }

            const user = window.firebaseAuth.currentUser;
            if (user) {
                try {
                    await user.updatePassword(newPassword);
                    displayMessageBox('Password updated successfully!', 'success');
                    accountSettingsModal.style.display = 'none';
                } catch (error) {
                    console.error("Error updating password:", error);
                    displayMessageBox('Failed to update password: ' + error.message, 'error');
                }
            }
        });
    }
    dropdownAddAccountBtn.addEventListener('click', (event) => { event.preventDefault(); displayMessageBox('Add Account / Sign In functionality is a placeholder. This usually redirects to login/signup.', 'info'); window.location.href = '/login'; });


    // --- Theme Toggle Logic (Light/Dark Mode) ---
    const applyTheme = (isDark) => {
        if (isDark) { document.body.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
        else { document.body.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    };
    const savedTheme = localStorage.getItem('theme');
    if (themeToggle) {
        if (savedTheme === 'dark') { themeToggle.checked = true; applyTheme(true); }
        else { themeToggle.checked = false; applyTheme(false); }
        themeToggle.addEventListener('change', () => { applyTheme(themeToggle.checked); });
    }

    // --- Setup Role Switching Listeners ---
    setupRoleSwitchingListeners();

    // --- Firebase Auth & User Info Display ---
    const avatarColors = ['bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4', 'bg-avatar-5', 'bg-avatar-6', 'bg-avatar-7'];
    const getAvatarColorClass = (email) => {
        let hash = 0; for (let i = 0; i < email.length; i++) { hash = email.charCodeAt(i) + ((hash << 5) - hash); }
        const index = Math.abs(hash % avatarColors.length);
        return avatarColors[index];
    };

    window.firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            const username = user.displayName || user.email.split('@')[0];
            document.getElementById('welcome-message').textContent = `Welcome, ${username}!`;
            const initial = username.charAt(0).toUpperCase();
            accountInitial.textContent = initial;
            accountAvatarCircle.classList.remove(...avatarColors);
            accountAvatarCircle.classList.add(getAvatarColorClass(user.email));
            dropdownEmail.textContent = user.email || 'N/A';
            dropdownUsername.textContent = username;
            console.log("User is logged in and state is confirmed:", user.uid, user.email);

            // Fetch user profile to update department
            try {
                const token = await user.getIdToken();
                const response = await fetch('/get_user_profile', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    const userData = await response.json();
                    if (userData.department) {
                        const deptEl = document.getElementById('user-department');
                        if (deptEl) deptEl.textContent = userData.department;
                    }
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
            }

            // After user is authenticated, attempt to load their existing questions
            await loadUserQuestions();
        } else {
            console.log("No user logged in, redirecting to login page.");
            displayMessageBox("You are not logged in. Please log in to access the dashboard.", 'warning');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
    });

    // --- Load User Questions from Firestore on Auth State Change ---
    async function loadUserQuestions() {
        const user = window.firebaseAuth.currentUser;
        if (!user) return;

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/get_user_questions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                currentParsedQuestions = data.questions;
                populateLeftPane(currentParsedQuestions);
                displayMessageBox(`Loaded ${currentParsedQuestions.length} questions from your bank.`, 'success');
            } else {
                displayMessageBox(`Failed to load questions: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayMessageBox(`Network error loading questions: ${error.message}`, 'error');
            console.error('Load questions fetch error:', error);
        }
    }


    // --- Settings Section Collapsible Logic (using Flowbite's Collapse component) ---
    document.querySelectorAll('[data-collapse-toggle]').forEach(trigger => {
        const targetEl = document.getElementById(trigger.getAttribute('data-collapse-toggle'));
        if (targetEl) {
            new Flowbite.Collapse(targetEl, trigger);
            trigger.addEventListener('click', () => {
                const icon = trigger.querySelector('.fas.fa-chevron-down');
                if (icon) { icon.classList.toggle('rotate-180'); }
            });
        }
    });

    // --- Custom Message Box (instead of alert/confirm) ---
    function displayMessageBox(message, type = 'info', duration = 3000) {
        // Respect notification toggles
        try {
            const settings = JSON.parse(localStorage.getItem('smartqpgen-settings') || '{}');
            const notify = settings?.general || {};
            if (type === 'success' && notify.notifySaveSuccess === false) return;
            if (type === 'error' && notify.notifyErrors === false) return;
            if ((type === 'info' || type === 'warning') && notify.notifyTips === false) return;
        } catch (_) { /* ignore and show */ }
        let bgColor = 'bg-blue-500';
        if (type === 'success') bgColor = 'bg-green-500';
        else if (type === 'error') bgColor = 'bg-red-500';
        else if (type === 'warning') bgColor = 'bg-yellow-500';

        const messageBox = document.createElement('div');
        messageBox.className = `fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg z-50 ${bgColor}`;
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.remove();
        }, duration);
    }

    // --- Splitter (Resizable Panes) Logic ---
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const splitter = document.getElementById('splitter');
    const qpEditorFlexContainer = document.querySelector('.qp-editor-flex-container'); // Get the direct parent of panes

    let isDragging = false;

    if (splitter && leftPane && rightPane && qpEditorFlexContainer) {
        // Initialize panes to equal sizes
        function resetPanesToEqual() {
            leftPane.style.flex = '1 1 0';
            rightPane.style.flex = '1 1 0';
            leftPane.style.width = '';
            rightPane.style.width = '';
            leftPane.style.minWidth = '0';
            rightPane.style.minWidth = '0';
            leftPane.style.maxWidth = 'none';
            rightPane.style.maxWidth = 'none';
        }

        // Function to maintain equal sizes after content changes
        function maintainEqualSizes() {
            // Use requestAnimationFrame to ensure DOM has updated
            requestAnimationFrame(() => {
                resetPanesToEqual();

                // Add a subtle visual feedback (optional)
                leftPane.style.transition = 'flex 0.2s ease';
                rightPane.style.transition = 'flex 0.2s ease';

                // Remove transition after animation
                setTimeout(() => {
                    leftPane.style.transition = '';
                    rightPane.style.transition = '';
                }, 200);
            });
        }

        // Reset to equal sizes on load
        resetPanesToEqual();

        // Make the function globally available for use after content updates
        window.maintainEqualPaneSizes = maintainEqualSizes;

        // Set up MutationObserver to automatically maintain equal sizes when content changes
        const observer = new MutationObserver((mutations) => {
            let shouldMaintainSizes = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' &&
                    (mutation.target === leftPane || mutation.target === rightPane ||
                        mutation.target.closest('#left-pane') || mutation.target.closest('#right-pane'))) {
                    shouldMaintainSizes = true;
                }
            });
            if (shouldMaintainSizes) {
                maintainEqualSizes();
            }
        });

        // Start observing changes in both panes
        observer.observe(leftPane, { childList: true, subtree: true });
        observer.observe(rightPane, { childList: true, subtree: true });

        splitter.addEventListener('mousedown', (e) => {
            isDragging = true;
            // Add class to body to prevent text selection during drag
            document.body.classList.add('select-none');
            // Capture pointer outside of splitter too
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Double-click splitter to reset to equal sizes
        splitter.addEventListener('dblclick', (e) => {
            resetPanesToEqual();
        });

        function onMouseMove(e) {
            if (!isDragging) return;

            const containerWidth = qpEditorFlexContainer.offsetWidth;
            const containerLeft = qpEditorFlexContainer.getBoundingClientRect().left;

            let newLeftWidth = e.clientX - containerLeft;

            // Convert to percentage
            let newLeftPercent = (newLeftWidth / containerWidth) * 100;

            // Apply min-width constraints (based on 25% of container)
            const minWidthPercent = 25; // As defined in HTML inline style
            if (newLeftPercent < minWidthPercent) {
                newLeftPercent = minWidthPercent;
            }
            if (newLeftPercent > (100 - minWidthPercent)) {
                newLeftPercent = (100 - minWidthPercent);
            }

            // Update the flex property to override the default flex: 1
            leftPane.style.flex = `0 0 ${newLeftPercent}%`;
            rightPane.style.flex = `0 0 ${100 - newLeftPercent}%`;
        }

        function onMouseUp() {
            isDragging = false;
            document.body.classList.remove('select-none');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    // --- Requirements for QP Functionality ---

    // Global requirements object to store current requirements
    let currentRequirements = {};

    // Get all requirement form elements
    const requirementsForm = document.getElementById('qp-requirements-form');
    const validateBtn = document.getElementById('validate-requirements-btn');
    const resetBtn = document.getElementById('reset-requirements-btn');
    const previewBtn = document.getElementById('preview-requirements-btn');
    const applyBtn = document.getElementById('apply-requirements-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const loadTemplateBtn = document.getElementById('load-template-btn');
    const requirementsSummary = document.getElementById('requirements-summary');
    const summaryContent = document.getElementById('summary-content');

    // Bloom's taxonomy validation
    function validateBloomsTaxonomy() {
        const l1 = parseInt(document.getElementById('req-l1-percent').value) || 0;
        const l2 = parseInt(document.getElementById('req-l2-percent').value) || 0;
        const l3 = parseInt(document.getElementById('req-l3-percent').value) || 0;
        const l4 = parseInt(document.getElementById('req-l4-percent').value) || 0;
        const l5 = parseInt(document.getElementById('req-l5-percent').value) || 0;
        const l6 = parseInt(document.getElementById('req-l6-percent').value) || 0;

        const total = l1 + l2 + l3 + l4 + l5 + l6;
        document.getElementById('blooms-total').textContent = total;

        const validation = document.getElementById('blooms-validation');
        if (total === 100) {
            validation.textContent = '✓ Valid';
            validation.className = 'ml-4 text-sm text-green-600 font-semibold';
            return true;
        } else {
            validation.textContent = `⚠ Must total 100% (currently ${total}%)`;
            validation.className = 'ml-4 text-sm text-red-600 font-semibold';
            return false;
        }
    }

    // CO weight validation
    function validateCOWeights() {
        const co1 = parseInt(document.getElementById('req-co1-weight').value) || 0;
        const co2 = parseInt(document.getElementById('req-co2-weight').value) || 0;
        const co3 = parseInt(document.getElementById('req-co3-weight').value) || 0;
        const co4 = parseInt(document.getElementById('req-co4-weight').value) || 0;
        const co5 = parseInt(document.getElementById('req-co5-weight').value) || 0;

        const total = co1 + co2 + co3 + co4 + co5;
        document.getElementById('co-total').textContent = total;

        const validation = document.getElementById('co-validation');
        if (total === 100) {
            validation.textContent = '✓ Valid';
            validation.className = 'ml-4 text-sm text-green-600 font-semibold';
            return true;
        } else {
            validation.textContent = `⚠ Must total 100% (currently ${total}%)`;
            validation.className = 'ml-4 text-sm text-red-600 font-semibold';
            return false;
        }
    }

    // Add event listeners for real-time validation
    ['req-l1-percent', 'req-l2-percent', 'req-l3-percent', 'req-l4-percent', 'req-l5-percent', 'req-l6-percent'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', validateBloomsTaxonomy);
        }
    });

    ['req-co1-weight', 'req-co2-weight', 'req-co3-weight', 'req-co4-weight', 'req-co5-weight'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', validateCOWeights);
        }
    });

    // Initial validation
    validateBloomsTaxonomy();
    validateCOWeights();

    // Collect all requirements from form
    function collectRequirements() {
        const formData = new FormData(requirementsForm);
        const requirements = {};

        // Basic Information
        requirements.subject = document.getElementById('req-subject').value;
        requirements.subjectCode = document.getElementById('req-subject-code').value;
        requirements.department = document.getElementById('req-department').value;
        requirements.semester = document.getElementById('req-semester').value;
        requirements.academicYear = document.getElementById('req-academic-year').value;
        requirements.examType = document.getElementById('req-exam-type').value;

        // Exam Details
        requirements.duration = document.getElementById('req-duration').value;
        requirements.totalMarks = document.getElementById('req-total-marks').value;
        requirements.examDate = document.getElementById('req-exam-date').value;
        requirements.examTime = document.getElementById('req-exam-time').value;

        // Question Distribution
        requirements.questionPattern = document.getElementById('req-question-pattern').value;
        requirements.numModules = document.getElementById('req-num-modules').value;
        requirements.moduleCoverage = document.getElementById('req-module-coverage').value;
        requirements.distributionRule = document.getElementById('req-distribution-rule').value;

        // Bloom's Taxonomy
        requirements.bloomsTaxonomy = {
            l1: parseInt(document.getElementById('req-l1-percent').value) || 0,
            l2: parseInt(document.getElementById('req-l2-percent').value) || 0,
            l3: parseInt(document.getElementById('req-l3-percent').value) || 0,
            l4: parseInt(document.getElementById('req-l4-percent').value) || 0,
            l5: parseInt(document.getElementById('req-l5-percent').value) || 0,
            l6: parseInt(document.getElementById('req-l6-percent').value) || 0
        };

        // Course Outcomes
        requirements.courseOutcomes = {
            co1: parseInt(document.getElementById('req-co1-weight').value) || 0,
            co2: parseInt(document.getElementById('req-co2-weight').value) || 0,
            co3: parseInt(document.getElementById('req-co3-weight').value) || 0,
            co4: parseInt(document.getElementById('req-co4-weight').value) || 0,
            co5: parseInt(document.getElementById('req-co5-weight').value) || 0
        };

        // Additional Requirements
        requirements.selectionStrategy = document.getElementById('req-selection-strategy').value;
        requirements.difficultyLevel = document.getElementById('req-difficulty-level').value;
        requirements.specialInstructions = document.getElementById('req-special-instructions').value;

        return requirements;
    }

    // Validate all requirements
    function validateAllRequirements() {
        const requirements = collectRequirements();
        const errors = [];

        // Check required fields
        if (!requirements.subject) errors.push('Subject Name is required');
        if (!requirements.subjectCode) errors.push('Subject Code is required');
        if (!requirements.department) errors.push('Department is required');
        if (!requirements.semester) errors.push('Semester is required');
        if (!requirements.academicYear) errors.push('Academic Year is required');
        if (!requirements.examType) errors.push('Exam Type is required');
        if (!requirements.duration) errors.push('Duration is required');
        if (!requirements.totalMarks) errors.push('Total Marks is required');
        if (!requirements.questionPattern) errors.push('Question Pattern is required');
        if (!requirements.numModules) errors.push('Number of Modules is required');
        if (!requirements.moduleCoverage) errors.push('Module Coverage is required');
        if (!requirements.distributionRule) errors.push('Distribution Rule is required');

        // Validate Bloom's taxonomy
        if (!validateBloomsTaxonomy()) {
            errors.push('Bloom\'s Taxonomy percentages must total 100%');
        }

        // Validate CO weights
        if (!validateCOWeights()) {
            errors.push('Course Outcome weights must total 100%');
        }

        return { isValid: errors.length === 0, errors, requirements };
    }

    // Generate requirements summary
    function generateSummary(requirements) {
        return `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h5 class="font-semibold text-gray-800 mb-2">Basic Information</h5>
                            <ul class="text-sm space-y-1">
                                <li><strong>Subject:</strong> ${requirements.subject}</li>
                                <li><strong>Code:</strong> ${requirements.subjectCode}</li>
                                <li><strong>Department:</strong> ${requirements.department}</li>
                                <li><strong>Semester:</strong> ${requirements.semester}</li>
                                <li><strong>Exam Type:</strong> ${requirements.examType}</li>
                            </ul>
                        </div>
                        <div>
                            <h5 class="font-semibold text-gray-800 mb-2">Exam Details</h5>
                            <ul class="text-sm space-y-1">
                                <li><strong>Duration:</strong> ${requirements.duration} Hours</li>
                                <li><strong>Total Marks:</strong> ${requirements.totalMarks}</li>
                                <li><strong>Pattern:</strong> ${requirements.questionPattern}</li>
                                <li><strong>Modules:</strong> ${requirements.numModules}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="mt-4">
                        <h5 class="font-semibold text-gray-800 mb-2">Bloom's Taxonomy Distribution</h5>
                        <div class="grid grid-cols-6 gap-2 text-sm">
                            <div>L1: ${requirements.bloomsTaxonomy.l1}%</div>
                            <div>L2: ${requirements.bloomsTaxonomy.l2}%</div>
                            <div>L3: ${requirements.bloomsTaxonomy.l3}%</div>
                            <div>L4: ${requirements.bloomsTaxonomy.l4}%</div>
                            <div>L5: ${requirements.bloomsTaxonomy.l5}%</div>
                            <div>L6: ${requirements.bloomsTaxonomy.l6}%</div>
                        </div>
                    </div>
                `;
    }

    // Event Handlers
    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            const validation = validateAllRequirements();
            if (validation.isValid) {
                displayMessageBox('✅ All requirements are valid! You can proceed to generate the question paper.', 'success');
                currentRequirements = validation.requirements;
            } else {
                const errorList = validation.errors.map(error => `• ${error}`).join('\n');
                displayMessageBox(`❌ Please fix the following errors:\n\n${errorList}`, 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all requirements? This will clear all entered data.')) {
                requirementsForm.reset();
                // Reset to default values
                document.getElementById('req-l1-percent').value = 10;
                document.getElementById('req-l2-percent').value = 20;
                document.getElementById('req-l3-percent').value = 30;
                document.getElementById('req-l4-percent').value = 25;
                document.getElementById('req-l5-percent').value = 10;
                document.getElementById('req-l6-percent').value = 5;

                document.getElementById('req-co1-weight').value = 20;
                document.getElementById('req-co2-weight').value = 20;
                document.getElementById('req-co3-weight').value = 20;
                document.getElementById('req-co4-weight').value = 20;
                document.getElementById('req-co5-weight').value = 20;

                validateBloomsTaxonomy();
                validateCOWeights();
                requirementsSummary.classList.add('hidden');
                displayMessageBox('Requirements form has been reset to default values.', 'info');
            }
        });
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const validation = validateAllRequirements();
            if (validation.isValid) {
                summaryContent.innerHTML = generateSummary(validation.requirements);
                requirementsSummary.classList.remove('hidden');
                requirementsSummary.scrollIntoView({ behavior: 'smooth' });
            } else {
                const errorList = validation.errors.map(error => `• ${error}`).join('\n');
                displayMessageBox(`❌ Cannot preview. Please fix errors:\n\n${errorList}`, 'error');
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const validation = validateAllRequirements();
            if (validation.isValid) {
                currentRequirements = validation.requirements;
                // Store requirements globally for use in question generation
                window.currentQPRequirements = currentRequirements;

                displayMessageBox('✅ Requirements applied successfully! Switching to Question Paper Editor...', 'success');

                // Switch to QP Editor with requirements applied
                setTimeout(() => {
                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    // Populate metadata in QP editor if needed
                    populateQPEditorWithRequirements(currentRequirements);
                }, 1500);
            } else {
                const errorList = validation.errors.map(error => `• ${error}`).join('\n');
                displayMessageBox(`❌ Cannot apply requirements. Please fix errors:\n\n${errorList}`, 'error');
            }
        });
    }

    // Template Management - MOVED TO requirements_form.js
    // if (saveTemplateBtn) { ... }
    // if (loadTemplateBtn) { ... }

    // Load requirements template into form
    function loadRequirementsTemplate(requirements) {
        // Basic Information
        document.getElementById('req-subject').value = requirements.subject || '';
        document.getElementById('req-subject-code').value = requirements.subjectCode || '';
        document.getElementById('req-department').value = requirements.department || '';
        document.getElementById('req-semester').value = requirements.semester || '';
        document.getElementById('req-academic-year').value = requirements.academicYear || '';
        document.getElementById('req-exam-type').value = requirements.examType || '';

        // Exam Details
        document.getElementById('req-duration').value = requirements.duration || '';
        document.getElementById('req-total-marks').value = requirements.totalMarks || '';
        document.getElementById('req-exam-date').value = requirements.examDate || '';
        document.getElementById('req-exam-time').value = requirements.examTime || '';

        // Question Distribution
        document.getElementById('req-question-pattern').value = requirements.questionPattern || '';
        document.getElementById('req-num-modules').value = requirements.numModules || '';
        document.getElementById('req-module-coverage').value = requirements.moduleCoverage || '';
        document.getElementById('req-distribution-rule').value = requirements.distributionRule || '';

        // Bloom's Taxonomy
        if (requirements.bloomsTaxonomy) {
            document.getElementById('req-l1-percent').value = requirements.bloomsTaxonomy.l1 || 0;
            document.getElementById('req-l2-percent').value = requirements.bloomsTaxonomy.l2 || 0;
            document.getElementById('req-l3-percent').value = requirements.bloomsTaxonomy.l3 || 0;
            document.getElementById('req-l4-percent').value = requirements.bloomsTaxonomy.l4 || 0;
            document.getElementById('req-l5-percent').value = requirements.bloomsTaxonomy.l5 || 0;
            document.getElementById('req-l6-percent').value = requirements.bloomsTaxonomy.l6 || 0;
        }

        // Course Outcomes
        if (requirements.courseOutcomes) {
            document.getElementById('req-co1-weight').value = requirements.courseOutcomes.co1 || 0;
            document.getElementById('req-co2-weight').value = requirements.courseOutcomes.co2 || 0;
            document.getElementById('req-co3-weight').value = requirements.courseOutcomes.co3 || 0;
            document.getElementById('req-co4-weight').value = requirements.courseOutcomes.co4 || 0;
            document.getElementById('req-co5-weight').value = requirements.courseOutcomes.co5 || 0;
        }

        // Additional Requirements
        document.getElementById('req-selection-strategy').value = requirements.selectionStrategy || 'random';
        document.getElementById('req-difficulty-level').value = requirements.difficultyLevel || 'mixed';
        document.getElementById('req-special-instructions').value = requirements.specialInstructions || '';

        // Revalidate after loading
        validateBloomsTaxonomy();
        validateCOWeights();
    }

    // Populate QP Editor with requirements
    function populateQPEditorWithRequirements(requirements) {
        // This function can be used to pre-populate the QP editor with requirement data
        console.log('Requirements applied to QP Editor:', requirements);

        // Update the metadata in the generate final document function
        if (window.updateQPMetadataFromRequirements) {
            window.updateQPMetadataFromRequirements(requirements);
        }
    }

    // --- Cool Dashboard Functionality ---

    // Animate dashboard elements on load
    function animateDashboard() {
        // Animate stats cards with staggered delay
        const statCards = document.querySelectorAll('[id^="stat-"]');
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 150);
        });

        // Animate quick action buttons
        const quickActions = document.querySelectorAll('.quick-action-btn');
        quickActions.forEach((btn, index) => {
            btn.style.opacity = '0';
            btn.style.transform = 'translateX(-30px)';
            setTimeout(() => {
                btn.style.transition = 'all 0.5s ease-out';
                btn.style.opacity = '1';
                btn.style.transform = 'translateX(0)';
            }, 800 + (index * 100));
        });

        // Animate recent activity items
        const activityItems = document.querySelectorAll('#recent-activity-list > div');
        activityItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(30px)';
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease-out';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 1200 + (index * 200));
        });
    }

    // Update dashboard statistics
    function updateDashboardStats() {
        try {
            // This function is now mostly a wrapper for loadDashboardMetrics
            // to ensure we always show real data instead of simulated values.
            if (typeof loadDashboardMetrics === 'function') {
                loadDashboardMetrics();
            } else {
                // Fallback for counts we can calculate locally
                const totalQuestions = currentParsedQuestions ? currentParsedQuestions.length : 0;
                const savedTemplatesRaw = localStorage.getItem('qp-requirements-templates');
                const savedTemplates = savedTemplatesRaw ? Object.keys(JSON.parse(savedTemplatesRaw)).length : 0;

                animateCounter('total-questions-count', totalQuestions);
                animateCounter('saved-templates-count', savedTemplates);
            }
        } catch (e) {
            console.error('Error updating dashboard stats:', e);
        }
    }

    // Animate number counters
    function animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 2000;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // Hover effects for stat cards moved to separate function for clarity
    function setupStatCardEffects() {
        const statCards = document.querySelectorAll('[id^="stat-"]');
        statCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = '';
            });
        });
    }

    // Update user name in welcome message
    function updateWelcomeMessage() {
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay && window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            const displayName = user.displayName || user.email.split('@')[0];
            userNameDisplay.textContent = displayName;
        }
    }

    // Initialize cool dashboard (animations and stats)
    function initializeCoolDashboard() {
        // Don't return early here if we want stats to update anyway, 
        // but guard specific UI elements if needed.
        const welcomeSection = document.getElementById('welcome-content');
        if (welcomeSection && welcomeSection.classList.contains('hidden') && !window.forceDashboardInit) return;

        setTimeout(() => {
            updateWelcomeMessage();
            updateDashboardStats();
            loadRecentActivity();
            if (typeof animateDashboard === 'function') animateDashboard();
            setupStatCardEffects();
        }, 100);
    }

    // Make dashboard functions globally available
    window.initializeCoolDashboard = initializeCoolDashboard;
    window.updateDashboardStats = updateDashboardStats;
    window.setupQuickActions = setupQuickActions;

    // Also expose loadDashboardMetrics if it exists
    if (typeof loadDashboardMetrics === 'function') {
        window.loadDashboardMetrics = loadDashboardMetrics;
    }

    // --- Saved QPs & Banks Functionality ---

    // Initialize saved content when shown
    function initializeSavedContent() {
        loadSavedItems();
        setupSavedEventListeners();
        updateSavedStatistics();
        renderSavedItems();

        // Reattach approval listeners in case they were lost
        setTimeout(() => {
            reattachApprovalListeners();
        }, 500);
    }

    // Load saved items from localStorage and other sources
    async function loadSavedItems(forceRefresh = false) {
        // Check cache first
        const now = Date.now();
        if (!forceRefresh && window.dataCache.isLoading) {
            console.log('Data already loading, waiting for existing request...');
            return window.dataCache.loadPromise;
        }

        if (!forceRefresh && (now - window.dataCache.lastLoadTime) < window.dataCache.cacheExpiry) {
            console.log('Using cached data, skipping API call');
            return;
        }

        // Set loading state
        window.dataCache.isLoading = true;
        window.dataCache.loadPromise = loadSavedItemsInternal();

        try {
            await window.dataCache.loadPromise;
        } finally {
            window.dataCache.isLoading = false;
        }
    }

    async function loadSavedItemsInternal() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                console.error('User not authenticated');
                loadSavedItemsFromLocalStorage();
                return;
            }

            console.log('Loading saved items from backend...');
            const idToken = await user.getIdToken();
            const response = await fetch('/get_saved_items', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Loaded saved items from backend:', data);
                console.log('Question papers from backend:', data.question_papers);
                console.log('Generated papers from backend:', data.generated_papers);

                // Initialize savedItems object properties
                window.savedItems.questionPapers = [];
                window.savedItems.questionBanks = [];
                window.savedItems.templates = [];

                // Process saved question papers with safe date parsing (Supabase format)
                console.log('Processing saved papers:', data.question_papers?.length || 0);
                const savedPapers = (data.question_papers || []).map(qp => {
                    // Fix question structure if needed
                    if (qp.questions && Array.isArray(qp.questions)) {
                        qp.questions = qp.questions.map(question => {
                            // Ensure marks is a number
                            if (question.marks && typeof question.marks !== 'number') {
                                question.marks = parseInt(question.marks) || 0;
                            }
                            return question;
                        });
                    }
                    let createdDate, modifiedDate;

                    try {
                        // Supabase returns ISO timestamp strings directly
                        createdDate = qp.created_at ? new Date(qp.created_at).toISOString() : new Date().toISOString();
                    } catch (e) {
                        console.warn('Invalid created date for paper:', qp.id, qp.created_at);
                        createdDate = new Date().toISOString();
                    }

                    try {
                        // Supabase returns ISO timestamp strings directly
                        modifiedDate = qp.updated_at ? new Date(qp.updated_at).toISOString() : new Date().toISOString();
                    } catch (e) {
                        console.warn('Invalid modified date for paper:', qp.id, qp.updated_at);
                        modifiedDate = new Date().toISOString();
                    }

                    return {
                        id: qp.id,
                        type: 'question-paper',
                        name: qp.paper_name || qp.name || 'Untitled Question Paper',
                        subject: qp.subject || 'Unknown Subject',
                        createdDate: createdDate,
                        modifiedDate: modifiedDate,
                        size: calculateSize(qp),
                        questions: qp.questions || [],
                        metadata: qp.metadata || {},
                        questionCount: qp.questions ? qp.questions.length : (qp.metadata ? qp.metadata.totalQuestions : 0),
                        totalMarks: qp.maxMarks || (qp.metadata ? qp.metadata.totalMarks : 100),
                        status: qp.status || 'draft',
                        tags: qp.tags || [],
                        data: qp
                    };
                });

                // Process generated question papers with safe date parsing
                const generatedPapers = (data.generated_papers || []).map(qp => {
                    // Fix question structure if needed
                    if (qp.questions && Array.isArray(qp.questions)) {
                        qp.questions = qp.questions.map(question => {
                            // Ensure marks is a number
                            if (question.marks && typeof question.marks !== 'number') {
                                question.marks = parseInt(question.marks) || 0;
                            }
                            return question;
                        });
                    }
                    let createdDate, modifiedDate;

                    try {
                        createdDate = qp.created_at ? new Date(qp.created_at.seconds * 1000).toISOString() : new Date().toISOString();
                    } catch (e) {
                        console.warn('Invalid created date for generated paper:', qp.id, qp.created_at);
                        createdDate = new Date().toISOString();
                    }

                    try {
                        modifiedDate = qp.updated_at ? new Date(qp.updated_at.seconds * 1000).toISOString() : new Date().toISOString();
                    } catch (e) {
                        console.warn('Invalid modified date for generated paper:', qp.id, qp.updated_at);
                        modifiedDate = new Date().toISOString();
                    }

                    return {
                        id: qp.id,
                        type: 'generated-paper',
                        name: qp.paper_name || 'Generated Question Paper',
                        subject: qp.subject || 'Unknown Subject',
                        createdDate: createdDate,
                        modifiedDate: modifiedDate,
                        size: calculateSize(qp),
                        questions: qp.questions || [],
                        metadata: qp.metadata || {},
                        questionCount: qp.questions ? qp.questions.length : (qp.metadata ? qp.metadata.totalQuestions : 0),
                        totalMarks: qp.maxMarks || (qp.metadata ? qp.metadata.totalMarks : 100),
                        status: qp.status || 'generated',
                        tags: qp.tags || [],
                        data: qp
                    };
                });

                // Combine both types of papers
                window.savedItems.questionPapers = [...savedPapers, ...generatedPapers];
                console.log('Processed saved papers:', savedPapers);
                console.log('Processed generated papers:', generatedPapers);
                console.log('Combined question papers:', window.savedItems.questionPapers);

                // Process question banks with safe date parsing
                console.log('Processing question banks:', data.question_banks?.length || 0);
                window.savedItems.questionBanks = (data.question_banks || []).map(bank => {
                    let createdDate, modifiedDate;

                    try {
                        // Handle both Firebase timestamp format and direct date strings
                        if (bank.uploaded_at && bank.uploaded_at.seconds) {
                            createdDate = new Date(bank.uploaded_at.seconds * 1000).toISOString();
                        } else if (bank.uploaded_at) {
                            createdDate = new Date(bank.uploaded_at).toISOString();
                        } else {
                            createdDate = new Date().toISOString();
                        }
                    } catch (e) {
                        console.warn('Invalid created date for bank:', bank.id, bank.uploaded_at);
                        createdDate = new Date().toISOString();
                    }

                    try {
                        // Handle both Firebase timestamp format and direct date strings
                        if (bank.uploaded_at && bank.uploaded_at.seconds) {
                            modifiedDate = new Date(bank.uploaded_at.seconds * 1000).toISOString();
                        } else if (bank.uploaded_at) {
                            modifiedDate = new Date(bank.uploaded_at).toISOString();
                        } else {
                            modifiedDate = new Date().toISOString();
                        }
                    } catch (e) {
                        console.warn('Invalid modified date for bank:', bank.id, bank.uploaded_at);
                        modifiedDate = new Date().toISOString();
                    }

                    return {
                        id: bank.id,
                        type: 'question-bank',
                        name: bank.source_file || 'Question Bank',
                        subject: bank.subject || 'Unknown Subject',
                        createdDate: createdDate,
                        modifiedDate: modifiedDate,
                        size: calculateSize(bank),
                        questionCount: 1, // Each document represents one question
                        data: bank
                    };
                });

                // Add current parsed questions as a bank if available
                if (currentParsedQuestions && currentParsedQuestions.length > 0) {
                    const currentBank = {
                        id: 'current-bank',
                        type: 'question-bank',
                        name: 'Current Question Bank',
                        subject: 'Current Session',
                        createdDate: new Date().toISOString(),
                        modifiedDate: new Date().toISOString(),
                        size: calculateSize({ questions: currentParsedQuestions }),
                        questionCount: currentParsedQuestions.length,
                        data: { questions: currentParsedQuestions }
                    };

                    // Remove existing current bank and add updated one
                    window.savedItems.questionBanks = window.savedItems.questionBanks.filter(bank => bank.id !== 'current-bank');
                    window.savedItems.questionBanks.unshift(currentBank);
                }

                // Process templates (placeholder for now)
                window.savedItems.templates = data.templates || [];

                console.log('Processed saved items:', window.savedItems);
                console.log('Final counts - Question Papers:', window.savedItems.questionPapers.length, 'Question Banks:', window.savedItems.questionBanks.length, 'Templates:', window.savedItems.templates.length);

                // Update cache timestamp
                window.dataCache.lastLoadTime = Date.now();

                updateSavedStatistics();
                renderSavedItems();
            } else {
                console.error('Failed to load saved items:', await response.text());
                loadSavedItemsFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading saved items:', error);
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                console.log('API timeout, falling back to localStorage');
            } else if (error.message.includes('429')) {
                console.log('Rate limit exceeded, falling back to localStorage');
            }
            loadSavedItemsFromLocalStorage();

            // Update cache timestamp even on error to prevent immediate retry
            window.dataCache.lastLoadTime = Date.now();
        }
    }

    // Fallback function to load from localStorage
    function loadSavedItemsFromLocalStorage() {
        // Initialize savedItems object properties
        window.savedItems.questionPapers = [];
        window.savedItems.questionBanks = [];
        window.savedItems.templates = [];

        // Load question papers from localStorage
        const savedQPs = JSON.parse(localStorage.getItem('saved-question-papers') || '[]');

        window.savedItems.questionPapers = savedQPs.map(qp => ({
            id: qp.id || generateId(),
            type: 'question-paper',
            name: qp.name || 'Untitled Question Paper',
            subject: qp.subject || 'Unknown Subject',
            createdDate: qp.createdDate || new Date().toISOString(),
            modifiedDate: qp.lastModified || qp.modifiedDate || new Date().toISOString(),
            size: calculateSize(qp),
            questions: qp.questions || [],
            metadata: qp.metadata || {},
            questionCount: qp.questions ? qp.questions.length : (qp.metadata ? qp.metadata.totalQuestions : 0),
            totalMarks: qp.maxMarks || (qp.metadata ? qp.metadata.totalMarks : 100),
            status: qp.status || 'draft',
            tags: qp.tags || [],
            data: qp
        }));

        // Load question banks (from current parsed questions and saved banks)
        const savedBanks = JSON.parse(localStorage.getItem('saved-question-banks') || '[]');
        window.savedItems.questionBanks = savedBanks.map(bank => ({
            id: bank.id || generateId(),
            type: 'question-bank',
            name: bank.name || 'Question Bank',
            subject: bank.subject || 'Unknown Subject',
            createdDate: bank.createdDate || new Date().toISOString(),
            modifiedDate: bank.modifiedDate || new Date().toISOString(),
            size: calculateSize(bank),
            questionCount: bank.questions ? bank.questions.length : 0,
            data: bank
        }));

        // Add current parsed questions as a bank if available
        if (currentParsedQuestions && currentParsedQuestions.length > 0) {
            const currentBank = {
                id: 'current-bank',
                type: 'question-bank',
                name: 'Current Question Bank',
                subject: 'Current Session',
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString(),
                size: calculateSize({ questions: currentParsedQuestions }),
                questionCount: currentParsedQuestions.length,
                data: { questions: currentParsedQuestions }
            };

            // Remove existing current bank and add updated one
            window.savedItems.questionBanks = window.savedItems.questionBanks.filter(bank => bank.id !== 'current-bank');
            window.savedItems.questionBanks.unshift(currentBank);
        }

        // Load templates
        const savedTemplates = JSON.parse(localStorage.getItem('qp-requirements-templates') || '{}');
        window.savedItems.templates = Object.entries(savedTemplates).map(([name, template]) => ({
            id: generateId(),
            type: 'template',
            name: name,
            subject: template.subject || 'Unknown Subject',
            createdDate: template.createdDate || new Date().toISOString(),
            modifiedDate: template.modifiedDate || new Date().toISOString(),
            size: calculateSize(template),
            data: template
        }));

        // Update cache timestamp
        window.dataCache.lastLoadTime = Date.now();

        updateSavedStatistics();
        renderSavedItems();
    }

    // Generate unique ID
    function generateId() {
        return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Calculate item size in KB
    function calculateSize(item) {
        const jsonString = JSON.stringify(item);
        return Math.round(jsonString.length / 1024 * 100) / 100; // KB with 2 decimal places
    }

    // Update statistics
    function updateSavedStatistics() {
        // Safety check for savedItems initialization
        if (!window.savedItems || !window.savedItems.questionPapers || !window.savedItems.questionBanks || !window.savedItems.templates) {
            console.warn('savedItems not properly initialized yet, skipping statistics update');
            return;
        }

        const qpCount = window.savedItems.questionPapers.length;
        const bankCount = window.savedItems.questionBanks.length;
        const templateCount = window.savedItems.templates.length;
        const totalSize = [...window.savedItems.questionPapers, ...window.savedItems.questionBanks, ...window.savedItems.templates]
            .reduce((sum, item) => sum + item.size, 0);

        document.getElementById('saved-qp-count').textContent = qpCount;
        document.getElementById('saved-bank-count').textContent = bankCount;
        document.getElementById('saved-template-count').textContent = templateCount;
        document.getElementById('saved-total-size').textContent = totalSize.toFixed(1) + ' KB';

        // Update tab counts
        document.getElementById('tab-all-count').textContent = qpCount + bankCount + templateCount;
        document.getElementById('tab-qp-count').textContent = qpCount;
        document.getElementById('tab-bank-count').textContent = bankCount;
        document.getElementById('tab-template-count').textContent = templateCount;
    }

    // Debounce mechanism for getFilteredItems
    let getFilteredItemsTimeout;

    // Get filtered and sorted items
    function getFilteredItems() {
        // Clear existing timeout
        if (getFilteredItemsTimeout) {
            clearTimeout(getFilteredItemsTimeout);
        }

        // Debounce the function call
        getFilteredItemsTimeout = setTimeout(() => {
            getFilteredItemsInternal();
        }, 100); // 100ms debounce
    }

    function getFilteredItemsInternal() {
        // Safety check for savedItems initialization
        if (!window.savedItems || !window.savedItems.questionPapers || !window.savedItems.questionBanks || !window.savedItems.templates) {
            console.warn('savedItems not properly initialized yet, returning empty array');
            return [];
        }

        console.log('getFilteredItems called with:', {
            currentFilter: window.currentFilter,
            questionPapers: window.savedItems.questionPapers.length,
            questionBanks: window.savedItems.questionBanks.length,
            templates: window.savedItems.templates.length
        });
        console.log('window.savedItems object:', window.savedItems);

        let allItems = [];

        if (window.currentFilter === 'all') {
            allItems = [...window.savedItems.questionPapers, ...window.savedItems.questionBanks, ...window.savedItems.templates];
        } else if (window.currentFilter === 'question-papers') {
            allItems = [...window.savedItems.questionPapers];
        } else if (window.currentFilter === 'question-banks') {
            allItems = [...window.savedItems.questionBanks];
        } else if (window.currentFilter === 'templates') {
            allItems = [...window.savedItems.templates];
        }

        // Apply search filter
        const searchTerm = document.getElementById('saved-search').value.toLowerCase();
        if (searchTerm) {
            allItems = allItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.subject.toLowerCase().includes(searchTerm) ||
                item.type.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        allItems.sort((a, b) => {
            switch (window.currentSort) {
                case 'date-desc':
                    return new Date(b.modifiedDate) - new Date(a.modifiedDate);
                case 'date-asc':
                    return new Date(a.modifiedDate) - new Date(b.modifiedDate);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'size-desc':
                    return b.size - a.size;
                default:
                    return 0;
            }
        });

        console.log('getFilteredItems returning:', allItems.length, 'items');
        return allItems;
    }

    // Render saved items
    function renderSavedItems() {
        // Safety check for savedItems initialization
        if (!window.savedItems || !window.savedItems.questionPapers || !window.savedItems.questionBanks || !window.savedItems.templates) {
            console.warn('savedItems not properly initialized yet, skipping render');
            return;
        }

        const filteredItems = getFilteredItemsInternal();
        console.log('renderSavedItems - filteredItems:', filteredItems.length);

        const startIndex = (window.currentPage - 1) * window.itemsPerPage;
        const endIndex = startIndex + window.itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        console.log('renderSavedItems - pageItems:', pageItems.length);

        const container = document.getElementById('saved-items-list');
        const emptyState = document.getElementById('saved-empty');
        const pagination = document.getElementById('saved-pagination');

        if (filteredItems.length === 0) {
            console.log('No filtered items, showing empty state');
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            pagination.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        container.innerHTML = pageItems.map(item => createItemCard(item)).join('');

        // Update pagination
        updatePagination(filteredItems.length);

        // Add event listeners to new cards
        addItemEventListeners();
    }

    // Create item card HTML
    function createItemCard(item) {
        const typeIcon = getTypeIcon(item.type);
        const typeColor = getTypeColor(item.type);
        const formattedDate = new Date(item.modifiedDate).toLocaleDateString();
        const formattedTime = new Date(item.modifiedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
                    <div class="item-card bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 border border-gray-200" data-item-id="${item.id}">
                        <div class="flex items-start justify-between">
                            <div class="flex items-start space-x-4 flex-1">
                                <div class="bg-${typeColor}-100 rounded-lg p-3">
                                    <i class="${typeIcon} text-${typeColor}-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-lg font-semibold text-gray-900 truncate">${item.name}</h4>
                                    <p class="text-gray-600 text-sm mb-2">${item.subject}</p>
                                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                                        <span class="flex items-center">
                                            <i class="fas fa-calendar-alt mr-1"></i>
                                            ${formattedDate} at ${formattedTime}
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-hdd mr-1"></i>
                                            ${item.size} KB
                                        </span>
                                        ${item.questionCount ? `
                                            <span class="flex items-center">
                                                <i class="fas fa-question-circle mr-1"></i>
                                                ${item.questionCount} questions
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="mt-2">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-800">
                                            ${item.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 ml-4">
                                <button class="view-item-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="use-item-btn p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors duration-200" title="Use This Item">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="download-item-btn p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors duration-200" title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="delete-item-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }

    // Get type icon
    function getTypeIcon(type) {
        switch (type) {
            case 'question-paper': return 'fas fa-file-alt';
            case 'question-bank': return 'fas fa-database';
            case 'template': return 'fas fa-bookmark';
            default: return 'fas fa-file';
        }
    }

    // Get type color
    function getTypeColor(type) {
        switch (type) {
            case 'question-paper': return 'blue';
            case 'question-bank': return 'green';
            case 'template': return 'purple';
            default: return 'gray';
        }
    }

    // Update pagination
    function updatePagination(totalItems) {
        const pagination = document.getElementById('saved-pagination');
        const startSpan = document.getElementById('pagination-start');
        const endSpan = document.getElementById('pagination-end');
        const totalSpan = document.getElementById('pagination-total');
        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');

        if (totalItems <= window.itemsPerPage) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');

        const startIndex = (window.currentPage - 1) * window.itemsPerPage + 1;
        const endIndex = Math.min(window.currentPage * window.itemsPerPage, totalItems);

        startSpan.textContent = startIndex;
        endSpan.textContent = endIndex;
        totalSpan.textContent = totalItems;

        prevBtn.disabled = window.currentPage === 1;
        nextBtn.disabled = window.currentPage === Math.ceil(totalItems / window.itemsPerPage);

        // Update page numbers
        const numbersContainer = document.getElementById('pagination-numbers');
        const totalPages = Math.ceil(totalItems / window.itemsPerPage);
        const maxVisiblePages = 5;

        let startPage = Math.max(1, window.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let numbersHTML = '';
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === window.currentPage;
            numbersHTML += `
                        <button class="pagination-number px-3 py-1 border rounded-md text-sm ${isActive ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-50'}" data-page="${i}">
                            ${i}
                        </button>
                    `;
        }

        numbersContainer.innerHTML = numbersHTML;
    }

    // Setup event listeners
    function setupSavedEventListeners() {
        // Search input
        const searchInput = document.getElementById('saved-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                window.currentPage = 1;
                renderSavedItems();
            }, 300));
        }

        // Filter dropdown
        const filterSelect = document.getElementById('saved-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                window.currentFilter = e.target.value;
                window.currentPage = 1;
                updateActiveTab();
                renderSavedItems();
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('saved-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                window.currentSort = e.target.value;
                renderSavedItems();
            });
        }

        // Tab buttons
        document.querySelectorAll('.saved-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                window.currentFilter = tab;
                window.currentPage = 1;

                // Update filter dropdown
                document.getElementById('saved-filter').value = tab;

                updateActiveTab();
                renderSavedItems();
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-saved-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refresh button clicked, forcing data refresh...');
                window.forceRefreshData();
                displayMessageBox('✅ Saved items refreshed successfully!', 'success');
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-all-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                showModal('export-modal');
            });
        }

        // Pagination buttons
        document.getElementById('pagination-prev').addEventListener('click', () => {
            if (window.currentPage > 1) {
                window.currentPage--;
                renderSavedItems();
            }
        });

        document.getElementById('pagination-next').addEventListener('click', () => {
            const totalItems = getFilteredItems().length;
            const totalPages = Math.ceil(totalItems / window.itemsPerPage);
            if (window.currentPage < totalPages) {
                window.currentPage++;
                renderSavedItems();
            }
        });

        // Pagination number clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-number')) {
                window.currentPage = parseInt(e.target.dataset.page);
                renderSavedItems();
            }
        });
    }

    // Update active tab
    function updateActiveTab() {
        document.querySelectorAll('.saved-tab-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            if (tab === window.currentFilter) {
                btn.classList.add('active', 'border-green-500', 'text-green-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                btn.classList.remove('active', 'border-green-500', 'text-green-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });
    }

    // Add event listeners to item cards
    function addItemEventListeners() {
        // View item buttons
        document.querySelectorAll('.view-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.itemId;
                viewItem(itemId);
            });
        });

        // Use item buttons
        document.querySelectorAll('.use-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.itemId;
                useItem(itemId);
            });
        });

        // Download item buttons
        document.querySelectorAll('.download-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.itemId;
                downloadItem(itemId);
            });
        });

        // Delete item buttons
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.itemId;
                confirmDeleteItem(itemId);
            });
        });
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Find item by ID
    function findItemById(itemId) {
        const allItems = [...window.savedItems.questionPapers, ...window.savedItems.questionBanks, ...window.savedItems.templates];
        return allItems.find(item => item.id === itemId);
    }

    // View item details
    function viewItem(itemId) {
        const item = findItemById(itemId);
        if (!item) return;

        const modal = document.getElementById('view-modal');
        const title = document.getElementById('view-modal-title');
        const content = document.getElementById('view-modal-content');

        title.textContent = `${item.name} - Details`;

        let contentHTML = `
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-2">Basic Information</h4>
                                <dl class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Name:</dt>
                                        <dd class="font-medium">${item.name}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Type:</dt>
                                        <dd class="font-medium">${item.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Subject:</dt>
                                        <dd class="font-medium">${item.subject}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Size:</dt>
                                        <dd class="font-medium">${item.size} KB</dd>
                                    </div>
                                </dl>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-2">Dates</h4>
                                <dl class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Created:</dt>
                                        <dd class="font-medium">${new Date(item.createdDate).toLocaleString()}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Modified:</dt>
                                        <dd class="font-medium">${new Date(item.modifiedDate).toLocaleString()}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                `;

        if (item.type === 'question-bank' && item.questionCount) {
            contentHTML += `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Question Bank Details</h4>
                            <p class="text-sm text-gray-600">Contains ${item.questionCount} questions</p>
                        </div>
                    `;
        }

        if (item.type === 'template' && item.data) {
            contentHTML += `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Template Configuration</h4>
                            <div class="bg-gray-50 rounded-lg p-4 text-sm">
                                <pre class="whitespace-pre-wrap">${JSON.stringify(item.data, null, 2)}</pre>
                            </div>
                        </div>
                    `;
        }

        contentHTML += '</div>';
        content.innerHTML = contentHTML;

        // Set up action button
        const actionBtn = document.getElementById('view-modal-action');
        actionBtn.onclick = () => {
            closeModal('view-modal');
            useItem(itemId);
        };

        showModal(modal.id);
    }

    // Use item
    function useItem(itemId) {
        const item = findItemById(itemId);
        if (!item) return;

        switch (item.type) {
            case 'question-paper':
                // Load question paper into editor
                if (item.data && item.data.questions) {
                    currentQuestionPaper.length = 0;
                    currentQuestionPaper.push(...item.data.questions);

                    // Set paper ID for approval functionality
                    if (item.id) {
                        window.currentPaperId = item.id;
                        console.log('Loaded paper ID set:', item.id);
                    }

                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    renderQPPreview();

                    // Show approval section and check status
                    showApprovalSection();
                    setTimeout(() => {
                        checkApprovalStatus();
                    }, 500);

                    displayMessageBox(`✅ Question paper "${item.name}" loaded successfully!`, 'success');
                }
                break;

            case 'question-bank':
                // Load question bank into left pane
                if (item.data && item.data.questions) {
                    currentParsedQuestions = item.data.questions;
                    showContent(qpEditorCanvas, 'Question Paper Editor');
                    populateLeftPane(currentParsedQuestions);
                    displayMessageBox(`✅ Question bank "${item.name}" loaded successfully!`, 'success');
                }
                break;

            case 'template':
                // Load template into requirements
                if (item.data) {
                    showContent(requirementsContent, 'Requirements for QP');
                    setTimeout(() => {
                        if (window.loadRequirementsTemplate) {
                            window.loadRequirementsTemplate(item.data);
                            displayMessageBox(`✅ Template "${item.name}" loaded successfully!`, 'success');
                        }
                    }, 300);
                }
                break;
        }
    }

    // Download item
    function downloadItem(itemId) {
        const item = findItemById(itemId);
        if (!item) return;

        if (item.type === 'question-paper') {
            // For question papers, show format selection
            showDownloadFormatModal(item);
        } else {
            // For other items, download as JSON
            const dataStr = JSON.stringify(item.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            displayMessageBox(`✅ "${item.name}" downloaded successfully!`, 'success');
        }
    }

    // Show download format modal for question papers
    function showDownloadFormatModal(item) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
                    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 class="text-lg font-semibold mb-4">Download "${item.name}"</h3>
                        <p class="text-gray-600 mb-6">Choose the format for download:</p>
                        <div class="flex gap-3">
                            <button onclick="downloadQuestionPaperAs('${item.id}', 'docx')" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                <i class="fas fa-file-word mr-2"></i>DOCX
                            </button>
                            <button onclick="downloadQuestionPaperAs('${item.id}', 'pdf')" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                                <i class="fas fa-file-pdf mr-2"></i>PDF
                            </button>
                            <button onclick="downloadQuestionPaperAs('${item.id}', 'json')" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                                <i class="fas fa-code mr-2"></i>JSON
                            </button>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Cancel
                        </button>
                    </div>
                `;
        document.body.appendChild(modal);
    }

    // Download question paper in specific format
    window.downloadQuestionPaperAs = async function (itemId, format) {
        const item = findItemById(itemId);
        if (!item) return;

        // Close modal
        document.querySelector('.fixed.inset-0')?.remove();

        if (format === 'json') {
            // Download as JSON
            const dataStr = JSON.stringify(item.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            displayMessageBox(`✅ "${item.name}" downloaded as JSON!`, 'success');
        } else {
            // Check if we have questions data
            if (!item.data.questions || item.data.questions.length === 0) {
                console.log('Questions missing, fetching full paper details...');
                displayMessageBox('Fetching full paper details...', 'info');

                try {
                    const user = window.firebaseAuth.currentUser;
                    if (!user) {
                        displayMessageBox('Please log in to download.', 'error');
                        return;
                    }

                    const idToken = await user.getIdToken();
                    const response = await fetch(`/get_question_paper/${item.id}`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`
                        }
                    });

                    if (response.ok) {
                        const fullPaper = await response.json();
                        // Merge full details into item.data
                        item.data = { ...item.data, ...fullPaper };
                        console.log('Full paper details fetched successfully');
                    } else {
                        console.error('Failed to fetch full paper details');
                        displayMessageBox('Failed to fetch full paper details. Please try again.', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching full paper:', error);
                    displayMessageBox('Error fetching paper details.', 'error');
                    return;
                }
            }

            // Generate and download as DOCX/PDF
            await generateDocumentFromSaved(item.data, format);
        }
    };

    // Confirm delete item
    function confirmDeleteItem(itemId) {
        const item = findItemById(itemId);
        if (!item) return;

        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-modal-message');

        message.textContent = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;

        const confirmBtn = document.getElementById('confirm-delete-btn');
        confirmBtn.onclick = () => {
            deleteItem(itemId);
            closeModal('delete-modal');
        };

        showModal(modal.id);
    }

    // Delete item
    function deleteItem(itemId) {
        const item = findItemById(itemId);
        if (!item) return;

        // Remove from appropriate array
        if (item.type === 'question-paper') {
            savedItems.questionPapers = savedItems.questionPapers.filter(qp => qp.id !== itemId);
            // Update localStorage
            const savedQPs = savedItems.questionPapers.map(qp => qp.data);
            localStorage.setItem('saved-question-papers', JSON.stringify(savedQPs));
        } else if (item.type === 'question-bank') {
            savedItems.questionBanks = savedItems.questionBanks.filter(bank => bank.id !== itemId);
            // Update localStorage (excluding current bank)
            const savedBanks = savedItems.questionBanks.filter(bank => bank.id !== 'current-bank').map(bank => bank.data);
            localStorage.setItem('saved-question-banks', JSON.stringify(savedBanks));
        } else if (item.type === 'template') {
            savedItems.templates = savedItems.templates.filter(template => template.id !== itemId);
            // Update localStorage
            const templates = JSON.parse(localStorage.getItem('qp-requirements-templates') || '{}');
            delete templates[item.name];
            localStorage.setItem('qp-requirements-templates', JSON.stringify(templates));
        }

        updateSavedStatistics();
        renderSavedItems();
        displayMessageBox(`✅ "${item.name}" deleted successfully!`, 'success');
    }

    // Close modal
    // Close modal
    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex', 'grid');
            // Clear inline styles set by showModal
            modal.style.display = 'none';
            modal.style.removeProperty('display');
            modal.style.removeProperty('visibility');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('z-index');
            modal.style.removeProperty('position');
        }
    };




    // Helper function to show modals with proper display classes
    window.showModal = function (modalId) {
        console.log('showModal called with ID:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log('Modal found, showing...');
            console.log('Modal classes before:', modal.className);
            console.log('Modal style before:', modal.style.display);

            // Remove hidden class
            modal.classList.remove('hidden');

            // Add flex class for modal display
            modal.classList.add('flex');

            // Force display style with !important
            modal.style.setProperty('display', 'flex', 'important');
            modal.style.setProperty('visibility', 'visible', 'important');
            modal.style.setProperty('opacity', '1', 'important');
            modal.style.setProperty('z-index', '9999', 'important');

            // Force dimensions and positioning
            modal.style.setProperty('position', 'fixed', 'important');
            modal.style.setProperty('top', '0', 'important');
            modal.style.setProperty('left', '0', 'important');
            modal.style.setProperty('width', '100vw', 'important');
            modal.style.setProperty('height', '100vh', 'important');
            modal.style.setProperty('min-width', '100vw', 'important');
            modal.style.setProperty('min-height', '100vh', 'important');

            console.log('Modal classes after:', modal.className);
            console.log('Modal style after:', modal.style.display);
            console.log('Modal computed style:', window.getComputedStyle(modal).display);
            console.log('Modal z-index:', window.getComputedStyle(modal).zIndex);
            console.log('Modal visibility:', window.getComputedStyle(modal).visibility);
            console.log('Modal opacity:', window.getComputedStyle(modal).opacity);
            console.log('Modal should be visible now');

            // Force a reflow
            modal.offsetHeight;

            // Additional check after a short delay
            setTimeout(() => {
                const rect = modal.getBoundingClientRect();
                console.log('Modal position:', rect);
                console.log('Modal dimensions:', rect.width, 'x', rect.height);
                if (rect.width === 0 || rect.height === 0) {
                    console.warn('Modal has zero dimensions - moving to body');

                    // Move modal to body to avoid container issues
                    document.body.appendChild(modal);

                    // Reapply styles
                    modal.style.setProperty('display', 'flex', 'important');
                    modal.style.setProperty('position', 'fixed', 'important');
                    modal.style.setProperty('top', '0', 'important');
                    modal.style.setProperty('left', '0', 'important');
                    modal.style.setProperty('width', '100vw', 'important');
                    modal.style.setProperty('height', '100vh', 'important');
                    modal.style.setProperty('z-index', '9999', 'important');

                    // Check dimensions again
                    const newRect = modal.getBoundingClientRect();
                    console.log('After moving to body - Modal dimensions:', newRect.width, 'x', newRect.height);
                }
            }, 100);
        } else {
            console.error('Modal not found with ID:', modalId);
        }
    };

    // Initialize saved content when the section is shown
    function initSavedContentWhenShown() {
        if (document.getElementById('saved-content').classList.contains('hidden')) return;
        initializeSavedContent();
    }

    // Make functions globally available
    window.initializeSavedContent = initializeSavedContent;
    window.initSavedContentWhenShown = initSavedContentWhenShown;

    // --- Recent Generated QPs Functionality ---

    // Global storage for recent QPs
    window.recentQPs = [];
    window.currentRecentFilter = 'all';
    window.currentRecentPeriod = 'all';
    window.currentRecentStatus = 'all';
    let currentRecentSort = 'date-desc';
    let currentRecentPage = 1;
    let currentRecentView = 'list';
    const recentItemsPerPage = 10;

    // Initialize recent content when shown
    function initializeRecentContent() {
        loadRecentQPs();
        setupRecentEventListeners();
        updateRecentStatistics();
        renderRecentQPs();
    }

    // Load recent QPs from localStorage and session data
    async function loadRecentQPs() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                console.error('User not authenticated');
                loadRecentQPsFromLocalStorage();
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/get_recent_papers', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const data = await response.json();

                // Process recent papers from backend
                window.recentQPs = data.recent_papers.map(paper => {
                    // Handle date parsing safely
                    let dateVal = new Date();
                    if (paper.created_at) {
                        if (typeof paper.created_at === 'string') {
                            dateVal = new Date(paper.created_at);
                        } else if (paper.created_at.seconds) {
                            dateVal = new Date(paper.created_at.seconds * 1000);
                        }
                    } else if (paper.saved_at) {
                        if (typeof paper.saved_at === 'string') {
                            dateVal = new Date(paper.saved_at);
                        } else if (paper.saved_at.seconds) {
                            dateVal = new Date(paper.saved_at.seconds * 1000);
                        }
                    }

                    return {
                        id: paper.id,
                        name: paper.paper_name || paper.name || 'Untitled Question Paper',
                        subject: paper.subject || 'Unknown Subject',
                        examType: paper.exam_type || paper.type || 'Mid-Term',
                        generatedDate: dateVal.toISOString(),
                        status: paper.status || 'success',
                        downloadCount: paper.download_count || 0,
                        shareCount: paper.share_count || 0,
                        fileSize: paper.size || paper.file_size || 0,
                        duration: paper.duration || 3,
                        totalMarks: paper.total_marks || paper.marks || 100,
                        questionCount: paper.question_count || 0,
                        tags: paper.tags || [],
                        source: paper.source, // Add source field
                        data: paper
                    };
                });

                // Sort by date (newest first) by default
                window.recentQPs.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));

                updateRecentStatistics();
                renderRecentQPs();
            } else {
                console.error('Failed to load recent papers:', await response.text());
                loadRecentQPsFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading recent papers:', error);
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                console.log('API timeout, falling back to localStorage');
            } else if (error.message.includes('429')) {
                console.log('Rate limit exceeded, falling back to localStorage');
            }
            loadRecentQPsFromLocalStorage();
        }
    }

    // Fallback function to load from localStorage
    function loadRecentQPsFromLocalStorage() {
        // Load from localStorage
        const storedRecent = JSON.parse(localStorage.getItem('recent-generated-qps') || '[]');

        // Don't add sample data if we have real data
        if (storedRecent.length === 0) {
            window.recentQPs = [];
        } else {
            window.recentQPs = storedRecent;
        }

        // Sort by date (newest first) by default
        window.recentQPs.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));

        updateRecentStatistics();
        renderRecentQPs();
    }

    // No more sample data - load real data from backend

    // Update recent statistics
    function updateRecentStatistics() {
        const totalCount = window.recentQPs.length;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekCount = window.recentQPs.filter(qp => new Date(qp.generatedDate) >= weekAgo).length;
        const downloadedCount = window.recentQPs.filter(qp => qp.status === 'downloaded' || qp.downloadCount > 0).length;
        const successRate = totalCount > 0 ? Math.round((window.recentQPs.filter(qp => qp.status === 'success' || qp.status === 'downloaded' || qp.status === 'shared').length / totalCount) * 100) : 100;

        document.getElementById('recent-total-count').textContent = totalCount;
        document.getElementById('recent-week-count').textContent = weekCount;
        document.getElementById('recent-downloaded-count').textContent = downloadedCount;
        document.getElementById('recent-success-rate').textContent = successRate + '%';
    }

    // Get filtered recent QPs
    function getFilteredRecentQPs() {
        let filtered = [...window.recentQPs];

        // Apply search filter
        const searchTerm = document.getElementById('recent-search').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(qp =>
                qp.name.toLowerCase().includes(searchTerm) ||
                qp.subject.toLowerCase().includes(searchTerm) ||
                qp.examType.toLowerCase().includes(searchTerm) ||
                new Date(qp.generatedDate).toLocaleDateString().includes(searchTerm)
            );
        }

        // Apply period filter
        if (currentRecentPeriod !== 'all') {
            const now = new Date();
            let cutoffDate;

            switch (currentRecentPeriod) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
            }

            if (cutoffDate) {
                filtered = filtered.filter(qp => new Date(qp.generatedDate) >= cutoffDate);
            }
        }

        // Apply status filter
        if (currentRecentStatus !== 'all') {
            filtered = filtered.filter(qp => qp.status === currentRecentStatus);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (currentRecentSort) {
                case 'date-desc':
                    return new Date(b.generatedDate) - new Date(a.generatedDate);
                case 'date-asc':
                    return new Date(a.generatedDate) - new Date(b.generatedDate);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'downloads-desc':
                    return b.downloadCount - a.downloadCount;
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Render recent QPs based on current view
    function renderRecentQPs() {
        const filteredQPs = getFilteredRecentQPs();
        const startIndex = (currentRecentPage - 1) * recentItemsPerPage;
        const endIndex = startIndex + recentItemsPerPage;
        const pageQPs = filteredQPs.slice(startIndex, endIndex);

        const emptyState = document.getElementById('recent-empty');
        const listView = document.getElementById('recent-list-view');
        const timelineView = document.getElementById('recent-timeline-view');
        const gridView = document.getElementById('recent-grid-view');
        const pagination = document.getElementById('recent-pagination');

        // Hide all views first
        if (listView) listView.classList.add('hidden');
        if (timelineView) timelineView.classList.add('hidden');
        if (gridView) gridView.classList.add('hidden');

        if (filteredQPs.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (pagination) pagination.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Show appropriate view
        switch (currentRecentView) {
            case 'list':
                listView.classList.remove('hidden');
                renderListView(pageQPs);
                break;
            case 'timeline':
                timelineView.classList.remove('hidden');
                renderTimelineView(pageQPs);
                break;
            case 'grid':
                gridView.classList.remove('hidden');
                renderGridView(pageQPs);
                break;
        }

        // Update pagination
        updateRecentPagination(filteredQPs.length);

        // Add event listeners
        addRecentEventListeners();
    }

    // Render list view
    function renderListView(qps) {
        const container = document.getElementById('recent-list-view');
        container.innerHTML = qps.map(qp => createListItemCard(qp)).join('');
    }

    // Render timeline view
    function renderTimelineView(qps) {
        const container = document.getElementById('recent-timeline-items');
        container.innerHTML = qps.map(qp => createTimelineItem(qp)).join('');
    }

    // Render grid view
    function renderGridView(qps) {
        const container = document.getElementById('recent-grid-view');
        container.innerHTML = qps.map(qp => createGridCard(qp)).join('');
    }

    // Create list item card
    function createListItemCard(qp) {
        const formattedDate = new Date(qp.generatedDate).toLocaleDateString();
        const formattedTime = new Date(qp.generatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const statusColor = getStatusColor(qp.status);
        const statusIcon = getStatusIcon(qp.status);

        return `
                    <div class="recent-item-card bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 border border-gray-200" data-qp-id="${qp.id}">
                        <div class="flex items-start justify-between">
                            <div class="flex items-start space-x-4 flex-1">
                                <div class="bg-yellow-100 rounded-lg p-3">
                                    <i class="fas fa-file-alt text-yellow-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-lg font-semibold text-gray-900 truncate">${qp.name}</h4>
                                    <p class="text-gray-600 text-sm mb-2">${qp.subject}</p>
                                    <div class="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                        <span class="flex items-center">
                                            <i class="fas fa-calendar-alt mr-1"></i>
                                            ${formattedDate} at ${formattedTime}
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-clock mr-1"></i>
                                            ${qp.duration}h
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-star mr-1"></i>
                                            ${qp.totalMarks} marks
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-question-circle mr-1"></i>
                                            ${qp.questionCount} questions
                                        </span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">
                                            <i class="${statusIcon} mr-1"></i>
                                            ${qp.status.charAt(0).toUpperCase() + qp.status.slice(1)}
                                        </span>
                                        <span class="text-xs text-gray-500">
                                            <i class="fas fa-download mr-1"></i>${qp.downloadCount} downloads
                                        </span>
                                        <span class="text-xs text-gray-500">
                                            <i class="fas fa-share mr-1"></i>${qp.shareCount} shares
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 ml-4">
                                <button class="view-recent-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="share-recent-btn p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors duration-200" title="Share">
                                    <i class="fas fa-share-alt"></i>
                                </button>
                                <button class="download-docx-btn p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors duration-200" title="Download DOCX">
                                    <i class="fas fa-file-word"></i>
                                </button>
                                <button class="download-pdf-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200" title="Download PDF">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                                <button class="rename-recent-btn p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-200" title="Rename">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-recent-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }

    // Create timeline item
    function createTimelineItem(qp) {
        const formattedDate = new Date(qp.generatedDate).toLocaleDateString();
        const formattedTime = new Date(qp.generatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const statusColor = getStatusColor(qp.status);
        const statusIcon = getStatusIcon(qp.status);

        return `
                    <div class="recent-timeline-item relative pl-16" data-qp-id="${qp.id}">
                        <!-- Timeline dot -->
                        <div class="absolute left-6 w-4 h-4 bg-yellow-500 rounded-full border-4 border-white shadow-md"></div>

                        <!-- Content -->
                        <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${qp.name}</h4>
                                    <p class="text-gray-600 text-sm">${qp.subject}</p>
                                </div>
                                <span class="text-sm text-gray-500">${formattedTime}</span>
                            </div>

                            <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                <span><i class="fas fa-clock mr-1"></i>${qp.duration}h</span>
                                <span><i class="fas fa-star mr-1"></i>${qp.totalMarks} marks</span>
                                <span><i class="fas fa-question-circle mr-1"></i>${qp.questionCount} questions</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">
                                    <i class="${statusIcon} mr-1"></i>
                                    ${qp.status.charAt(0).toUpperCase() + qp.status.slice(1)}
                                </span>

                                <div class="flex space-x-2">
                                    <button class="view-recent-btn p-1 text-blue-600 hover:text-blue-800" title="View">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="share-recent-btn p-1 text-green-600 hover:text-green-800" title="Share">
                                        <i class="fas fa-share-alt"></i>
                                    </button>
                                    <button class="download-pdf-btn p-1 text-red-600 hover:text-red-800" title="Download PDF">
                                        <i class="fas fa-file-pdf"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
    }

    // Create grid card
    function createGridCard(qp) {
        const formattedDate = new Date(qp.generatedDate).toLocaleDateString();
        const statusColor = getStatusColor(qp.status);
        const statusIcon = getStatusIcon(qp.status);

        return `
                    <div class="recent-grid-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden" data-qp-id="${qp.id}">
                        <!-- Header -->
                        <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 text-white">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h4 class="font-semibold text-lg truncate">${qp.name}</h4>
                                    <p class="text-yellow-100 text-sm truncate">${qp.subject}</p>
                                </div>
                                <i class="fas fa-file-alt text-2xl text-yellow-200"></i>
                            </div>
                        </div>

                        <!-- Content -->
                        <div class="p-4">
                            <div class="space-y-2 mb-4">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Generated:</span>
                                    <span class="font-medium">${formattedDate}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Duration:</span>
                                    <span class="font-medium">${qp.duration} hours</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Total Marks:</span>
                                    <span class="font-medium">${qp.totalMarks}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Questions:</span>
                                    <span class="font-medium">${qp.questionCount}</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-center mb-4">
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">
                                    <i class="${statusIcon} mr-1"></i>
                                    ${qp.status.charAt(0).toUpperCase() + qp.status.slice(1)}
                                </span>
                                <div class="text-xs text-gray-500">
                                    <i class="fas fa-download mr-1"></i>${qp.downloadCount}
                                    <i class="fas fa-share ml-2 mr-1"></i>${qp.shareCount}
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex space-x-2">
                                <button class="view-recent-btn flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition duration-200">
                                    <i class="fas fa-eye mr-1"></i>View
                                </button>
                                <button class="download-pdf-btn flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition duration-200">
                                    <i class="fas fa-file-pdf mr-1"></i>PDF
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }

    // Get status color
    function getStatusColor(status) {
        switch (status) {
            case 'success': return 'green';
            case 'downloaded': return 'blue';
            case 'shared': return 'purple';
            case 'archived': return 'gray';
            default: return 'yellow';
        }
    }

    // Get status icon
    function getStatusIcon(status) {
        switch (status) {
            case 'success': return 'fas fa-check-circle';
            case 'downloaded': return 'fas fa-download';
            case 'shared': return 'fas fa-share-alt';
            case 'archived': return 'fas fa-archive';
            default: return 'fas fa-clock';
        }
    }

    // Update recent pagination
    function updateRecentPagination(totalItems) {
        const pagination = document.getElementById('recent-pagination');
        const startSpan = document.getElementById('recent-pagination-start');
        const endSpan = document.getElementById('recent-pagination-end');
        const totalSpan = document.getElementById('recent-pagination-total');
        const prevBtn = document.getElementById('recent-pagination-prev');
        const nextBtn = document.getElementById('recent-pagination-next');

        if (totalItems <= recentItemsPerPage) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');

        const startIndex = (currentRecentPage - 1) * recentItemsPerPage + 1;
        const endIndex = Math.min(currentRecentPage * recentItemsPerPage, totalItems);

        startSpan.textContent = startIndex;
        endSpan.textContent = endIndex;
        totalSpan.textContent = totalItems;

        prevBtn.disabled = currentRecentPage === 1;
        nextBtn.disabled = currentRecentPage === Math.ceil(totalItems / recentItemsPerPage);

        // Update page numbers
        const numbersContainer = document.getElementById('recent-pagination-numbers');
        const totalPages = Math.ceil(totalItems / recentItemsPerPage);
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentRecentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let numbersHTML = '';
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentRecentPage;
            numbersHTML += `
                        <button class="recent-pagination-number px-3 py-1 border rounded-md text-sm ${isActive ? 'bg-yellow-600 text-white border-yellow-600' : 'border-gray-300 hover:bg-gray-50'}" data-page="${i}">
                            ${i}
                        </button>
                    `;
        }

        numbersContainer.innerHTML = numbersHTML;
    }

    // Update active view button
    function updateActiveViewButton() {
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-yellow-600', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });

        const activeBtn = document.getElementById(`${currentRecentView}-view-btn`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-yellow-600', 'text-white');
            activeBtn.classList.remove('bg-gray-300', 'text-gray-700');
        }
    }

    // Add event listeners to recent items
    function addRecentEventListeners() {
        // View buttons
        document.querySelectorAll('.view-recent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                viewRecentQP(qpId);
            });
        });

        // Share buttons
        document.querySelectorAll('.share-recent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                shareRecentQP(qpId);
            });
        });

        // Download buttons
        document.querySelectorAll('.download-docx-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                downloadRecentQP(qpId, 'docx');
            });
        });

        document.querySelectorAll('.download-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                downloadRecentQP(qpId, 'pdf');
            });
        });

        // Rename buttons
        document.querySelectorAll('.rename-recent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                renameRecentQP(qpId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-recent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qpId = e.target.closest('[data-qp-id]').dataset.qpId;
                deleteRecentQP(qpId);
            });
        });
    }

    // Find recent QP by ID
    function findRecentQPById(qpId) {
        return window.recentQPs.find(qp => qp.id === qpId);
    }

    // View recent QP details
    function viewRecentQP(qpId) {
        const qp = findRecentQPById(qpId);
        if (!qp) return;

        const modal = document.getElementById('recent-view-modal');
        const title = document.getElementById('recent-view-modal-title');
        const content = document.getElementById('recent-view-modal-content');

        title.textContent = `${qp.name} - Details`;

        content.innerHTML = `
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">Basic Information</h4>
                                <dl class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Name:</dt>
                                        <dd class="font-medium">${qp.name}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Subject:</dt>
                                        <dd class="font-medium">${qp.subject}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Exam Type:</dt>
                                        <dd class="font-medium">${qp.examType}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Duration:</dt>
                                        <dd class="font-medium">${qp.duration} hours</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Total Marks:</dt>
                                        <dd class="font-medium">${qp.totalMarks}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Questions:</dt>
                                        <dd class="font-medium">${qp.questionCount}</dd>
                                    </div>
                                </dl>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">Generation Details</h4>
                                <dl class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Generated:</dt>
                                        <dd class="font-medium">${new Date(qp.generatedDate).toLocaleString()}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Status:</dt>
                                        <dd class="font-medium">
                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(qp.status)}-100 text-${getStatusColor(qp.status)}-800">
                                                <i class="${getStatusIcon(qp.status)} mr-1"></i>
                                                ${qp.status.charAt(0).toUpperCase() + qp.status.slice(1)}
                                            </span>
                                        </dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Downloads:</dt>
                                        <dd class="font-medium">${qp.downloadCount}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Shares:</dt>
                                        <dd class="font-medium">${qp.shareCount}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">File Size:</dt>
                                        <dd class="font-medium">${qp.fileSize} KB</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        ${qp.metadata ? `
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">Academic Information</h4>
                                <dl class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Department:</dt>
                                        <dd class="font-medium">${qp.metadata.department || 'N/A'}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Semester:</dt>
                                        <dd class="font-medium">${qp.metadata.semester || 'N/A'}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-600">Academic Year:</dt>
                                        <dd class="font-medium">${qp.metadata.academicYear || 'N/A'}</dd>
                                    </div>
                                </dl>
                            </div>
                        ` : ''}
                    </div>
                `;

        // Set up download button
        const downloadBtn = document.getElementById('recent-view-modal-download');
        downloadBtn.onclick = () => {
            downloadRecentQP(qpId, 'pdf');
        };

        showModal(modal.id);
    }

    // Close recent modal
    // Close recent modal
    window.closeRecentModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Use the robust closeModal function if available, or implement similar logic
            if (typeof window.closeModal === 'function') {
                window.closeModal(modalId);
            } else {
                // Fallback logic if window.closeModal is not available
                modal.classList.add('hidden');
                modal.classList.remove('flex');

                // Clear all inline styles that showModal might have set
                modal.style.removeProperty('display');
                modal.style.removeProperty('visibility');
                modal.style.removeProperty('opacity');
                modal.style.removeProperty('z-index');
                modal.style.removeProperty('position');
                modal.style.removeProperty('width');
                modal.style.removeProperty('height');
                modal.style.removeProperty('top');
                modal.style.removeProperty('left');
                modal.style.display = 'none';
            }
        }
    };

    // Placeholder functions for actions (to be implemented)
    function shareRecentQP(qpId) {
        const qp = findRecentQPById(qpId);
        if (!qp) return;

        // Show share modal
        const modal = document.getElementById('recent-share-modal');
        const linkInput = document.getElementById('share-link-input');

        // Generate share link (placeholder)
        const shareLink = `${window.location.origin}/share/qp/${qpId}`;
        linkInput.value = shareLink;

        showModal(modal.id);

        // Copy link functionality
        document.getElementById('copy-link-btn').onclick = () => {
            linkInput.select();
            document.execCommand('copy');
            displayMessageBox('✅ Share link copied to clipboard!', 'success');
        };
    }

    function downloadRecentQP(qpId, format) {
        const qp = findRecentQPById(qpId);
        if (!qp) return;

        // Use data from backend if available (preferred)
        let paperData = qp.data;

        // Fallback to localStorage if not in backend data (e.g. legacy or offline)
        if (!paperData || !paperData.questions) {
            const savedQPs = JSON.parse(localStorage.getItem('saved-question-papers') || '[]');
            const savedQP = savedQPs.find(saved => saved.id === qpId);
            if (savedQP) {
                paperData = savedQP;
            }
        }

        if (paperData && paperData.questions) {
            // Generate and download the actual document
            generateDocumentFromSaved(paperData, format);
        } else {
            // If no saved data, show message
            displayMessageBox(`⚠️ Original question paper data not found. Please regenerate the question paper.`, 'warning');
            return;
        }

        // Update download count
        qp.downloadCount++;
        qp.status = 'downloaded';
        localStorage.setItem('recent-generated-qps', JSON.stringify(recentQPs));

        // Refresh display
        updateRecentStatistics();
        renderRecentQPs();
    }

    // Function to generate document from saved question paper
    async function generateDocumentFromSaved(savedQP, format) {
        const user = window.firebaseAuth.currentUser;
        if (!user) {
            displayMessageBox('Please log in to download the document.', 'error');
            return;
        }

        try {
            const idToken = await user.getIdToken();
            const paperName = savedQP.name || savedQP.paper_name || 'question_paper';
            const fileName = `${paperName.replace(/[^a-z0-9]/gi, '_')}.${format}`;

            const response = await fetch('/generate_final_document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    question_paper_data: savedQP.questions,
                    metadata: {
                        subject: savedQP.subject,
                        courseCode: savedQP.courseCode,
                        department: savedQP.department,
                        semester: savedQP.semester,
                        examType: savedQP.examType,
                        duration: savedQP.duration,
                        maxMarks: savedQP.maxMarks,
                        date: new Date().toLocaleDateString(),
                        time: savedQP.duration || '3 hours'
                    },
                    format: format
                })
            });

            if (response.ok) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                displayMessageBox(`✅ "${savedQP.name}" downloaded as ${format.toUpperCase()}!`, 'success');
            } else {
                const errorData = await response.json();
                displayMessageBox(`❌ Failed to generate ${format.toUpperCase()}: ${errorData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            displayMessageBox(`❌ Network error: ${error.message}`, 'error');
        }
    }

    function renameRecentQP(qpId) {
        const qp = findRecentQPById(qpId);
        if (!qp) return;

        const modal = document.getElementById('recent-rename-modal');
        const input = document.getElementById('rename-input');

        input.value = qp.name;
        showModal(modal.id);

        document.getElementById('confirm-rename-btn').onclick = () => {
            const newName = input.value.trim();
            if (newName && newName !== qp.name) {
                qp.name = newName;
                localStorage.setItem('recent-generated-qps', JSON.stringify(recentQPs));
                renderRecentQPs();
                displayMessageBox('✅ Question paper renamed successfully!', 'success');
            }
            closeRecentModal('recent-rename-modal');
        };
    }

    function deleteRecentQP(qpId) {
        const qp = findRecentQPById(qpId);
        if (!qp) return;

        const modal = document.getElementById('recent-delete-modal');
        const message = document.getElementById('recent-delete-modal-message');

        message.textContent = `Are you sure you want to delete "${qp.name}"? This action cannot be undone.`;
        showModal(modal.id);

        document.getElementById('recent-confirm-delete-btn').onclick = async () => {
            try {
                const user = window.firebaseAuth.currentUser;
                if (!user) {
                    displayMessageBox('Please log in to delete papers.', 'error');
                    return;
                }

                const idToken = await user.getIdToken();
                const response = await fetch('/delete_recent_paper', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        paper_id: qpId,
                        source: qp.source
                    })
                });

                if (response.ok) {
                    window.recentQPs = window.recentQPs.filter(item => item.id !== qpId);
                    localStorage.setItem('recent-generated-qps', JSON.stringify(window.recentQPs));
                    updateRecentStatistics();
                    renderRecentQPs();
                    displayMessageBox('✅ Question paper deleted successfully!', 'success');
                } else {
                    const data = await response.json();
                    displayMessageBox(`❌ Failed to delete paper: ${data.error || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Error deleting paper:', error);
                displayMessageBox(`❌ Network error: ${error.message}`, 'error');
            }
            closeRecentModal('recent-delete-modal');
        };
    }

    function exportRecentQPs() {
        const filteredQPs = getFilteredRecentQPs();
        const dataStr = JSON.stringify(filteredQPs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `recent_question_papers_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        displayMessageBox('✅ Recent QPs exported successfully!', 'success');
    }

    // Setup event listeners for recent functionality
    function setupRecentEventListeners() {
        // Search input
        const searchInput = document.getElementById('recent-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                currentRecentPage = 1;
                renderRecentQPs();
            }, 300));
        }

        // Filter dropdowns
        const periodFilter = document.getElementById('recent-period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                currentRecentPeriod = e.target.value;
                currentRecentPage = 1;
                renderRecentQPs();
            });
        }

        const statusFilter = document.getElementById('recent-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                currentRecentStatus = e.target.value;
                currentRecentPage = 1;
                renderRecentQPs();
            });
        }

        const sortSelect = document.getElementById('recent-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentRecentSort = e.target.value;
                renderRecentQPs();
            });
        }

        // View toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewType = e.target.id.replace('-view-btn', '').replace('list', 'list').replace('timeline', 'timeline').replace('grid', 'grid');
                currentRecentView = viewType;
                updateActiveViewButton();
                renderRecentQPs();
            });
        });

        // Header buttons
        const refreshBtn = document.getElementById('refresh-recent-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadRecentQPs();
                updateRecentStatistics();
                renderRecentQPs();
                displayMessageBox('✅ Recent QPs refreshed successfully!', 'success');
            });
        }

        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all recent question papers? This action cannot be undone.')) {
                    window.recentQPs = [];
                    localStorage.setItem('recent-generated-qps', JSON.stringify([]));
                    updateRecentStatistics();
                    renderRecentQPs();
                    displayMessageBox('✅ Recent QPs history cleared!', 'success');
                }
            });
        }

        const exportBtn = document.getElementById('export-recent-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportRecentQPs();
            });
        }

        // Pagination buttons
        document.getElementById('recent-pagination-prev').addEventListener('click', () => {
            if (currentRecentPage > 1) {
                currentRecentPage--;
                renderRecentQPs();
            }
        });

        document.getElementById('recent-pagination-next').addEventListener('click', () => {
            const totalItems = getFilteredRecentQPs().length;
            const totalPages = Math.ceil(totalItems / recentItemsPerPage);
            if (currentRecentPage < totalPages) {
                currentRecentPage++;
                renderRecentQPs();
            }
        });

        // Pagination number clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('recent-pagination-number')) {
                currentRecentPage = parseInt(e.target.dataset.page);
                renderRecentQPs();
            }
        });
    }

    // --- Settings & Help Functionality ---

    // Settings management
    let userSettings = {
        general: {
            defaultSubject: '',
            defaultDepartment: '',
            defaultSemester: '',
            defaultAcademicYear: '',
            notifyGenerationComplete: true,
            notifySaveSuccess: true,
            notifyErrors: true,
            notifyTips: true,
            autoSaveEnabled: true,
            autoSaveInterval: 300,
            backupToCloud: false
        },
        appearance: {
            themeMode: 'light',
            fontSize: 'medium',
            sidebarWidth: 'normal',
            enableAnimations: true,
            enableHoverEffects: true,
            enableLoadingAnimations: true,
            reduceMotion: false,
            primaryColor: '#3B82F6',
            accentColor: '#10B981',
            warningColor: '#F59E0B',
            dangerColor: '#EF4444'
        },
        generation: {
            defaultTotalMarks: 100,
            defaultDuration: 3,
            defaultSelectionStrategy: 'balanced',
            defaultDifficulty: 'mixed',
            defaultFormat: 'docx',
            includeHeader: true,
            includeInstructions: true,
            includeMarkingScheme: false,
            numberQuestions: true,
            validateBloomsTaxonomy: true,
            validateCoCoverage: true,
            validateDifficultyBalance: true,
            checkDuplicateQuestions: true,
            validateTotalMarks: true
        },
        advanced: {
            enableDebugMode: false,
            showPerformanceMetrics: false,
            enableExperimentalFeatures: false,
            encryptLocalData: false,
            clearOnExit: false,
            anonymousUsage: false
        }
    };

    // Initialize settings when shown
    function initializeSettingsContent() {
        loadUserSettings();
        setupSettingsEventListeners();
        updateSettingsUI();
        // Apply appearance based on current settings
        if (typeof applyAppearanceFromSettings === 'function') {
            applyAppearanceFromSettings();
        }
        updateStorageInfo();
        updateSystemInfo();
    }

    // Apply generation defaults into Requirements form when it first loads
    function applyGenerationDefaultsToForm() {
        try {
            const settings = userSettings?.generation || {};
            const totalMarksEl = document.getElementById('req-total-marks');
            const durationEl = document.getElementById('req-duration');
            const strategyEl = document.getElementById('req-selection-strategy');
            const difficultyEl = document.getElementById('req-difficulty-level');

            if (totalMarksEl && settings.defaultTotalMarks) {
                // If select has options, try select matching value
                const opt = [...totalMarksEl.options].find(o => o.value == String(settings.defaultTotalMarks));
                if (opt) totalMarksEl.value = String(settings.defaultTotalMarks);
            }
            if (durationEl && settings.defaultDuration) {
                const opt = [...durationEl.options].find(o => o.value == String(settings.defaultDuration));
                if (opt) durationEl.value = String(settings.defaultDuration);
            }
            if (strategyEl && settings.defaultSelectionStrategy) {
                strategyEl.value = settings.defaultSelectionStrategy === 'difficulty-based' ? 'difficulty' : settings.defaultSelectionStrategy;
            }
            if (difficultyEl && settings.defaultDifficulty) {
                difficultyEl.value = settings.defaultDifficulty;
            }
        } catch (e) {
            console.warn('Failed to apply generation defaults to form:', e);
        }
    }

    // Load user settings from localStorage
    function loadUserSettings() {
        const savedSettings = localStorage.getItem('smartqpgen-settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                userSettings = { ...userSettings, ...parsed };
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
    }

    // Save user settings to localStorage
    function saveUserSettings() {
        localStorage.setItem('smartqpgen-settings', JSON.stringify(userSettings));
        displayMessageBox('✅ Settings saved successfully!', 'success');
    }

    // Update settings UI with current values
    function updateSettingsUI() {
        // General settings
        document.getElementById('default-subject').value = userSettings.general.defaultSubject;
        document.getElementById('default-department').value = userSettings.general.defaultDepartment;
        document.getElementById('default-semester').value = userSettings.general.defaultSemester;
        document.getElementById('default-academic-year').value = userSettings.general.defaultAcademicYear;

        // Notification checkboxes
        document.getElementById('notify-generation-complete').checked = userSettings.general.notifyGenerationComplete;
        document.getElementById('notify-save-success').checked = userSettings.general.notifySaveSuccess;
        document.getElementById('notify-errors').checked = userSettings.general.notifyErrors;
        document.getElementById('notify-tips').checked = userSettings.general.notifyTips;

        // Auto-save settings
        document.getElementById('auto-save-enabled').checked = userSettings.general.autoSaveEnabled;
        document.getElementById('auto-save-interval').value = userSettings.general.autoSaveInterval;
        document.getElementById('backup-to-cloud').checked = userSettings.general.backupToCloud;

        // Appearance settings
        document.querySelector(`input[name="theme-mode"][value="${userSettings.appearance.themeMode}"]`).checked = true;
        document.getElementById('font-size-setting').value = userSettings.appearance.fontSize;
        document.getElementById('sidebar-width-setting').value = userSettings.appearance.sidebarWidth;

        // Animation checkboxes
        document.getElementById('enable-animations').checked = userSettings.appearance.enableAnimations;
        document.getElementById('enable-hover-effects').checked = userSettings.appearance.enableHoverEffects;
        document.getElementById('enable-loading-animations').checked = userSettings.appearance.enableLoadingAnimations;
        document.getElementById('reduce-motion').checked = userSettings.appearance.reduceMotion;

        // Color settings
        document.getElementById('primary-color').value = userSettings.appearance.primaryColor;
        document.getElementById('accent-color').value = userSettings.appearance.accentColor;
        document.getElementById('warning-color').value = userSettings.appearance.warningColor;
        document.getElementById('danger-color').value = userSettings.appearance.dangerColor;

        // Generation settings
        document.getElementById('default-total-marks').value = userSettings.generation.defaultTotalMarks;
        document.getElementById('default-duration').value = userSettings.generation.defaultDuration;
        document.getElementById('default-selection-strategy').value = userSettings.generation.defaultSelectionStrategy;
        document.getElementById('default-difficulty').value = userSettings.generation.defaultDifficulty;

        // Format settings
        document.querySelector(`input[name="default-format"][value="${userSettings.generation.defaultFormat}"]`).checked = true;
        document.getElementById('include-header').checked = userSettings.generation.includeHeader;
        document.getElementById('include-instructions').checked = userSettings.generation.includeInstructions;
        document.getElementById('include-marking-scheme').checked = userSettings.generation.includeMarkingScheme;
        document.getElementById('number-questions').checked = userSettings.generation.numberQuestions;

        // Validation settings
        document.getElementById('validate-blooms-taxonomy').checked = userSettings.generation.validateBloomsTaxonomy;
        document.getElementById('validate-co-coverage').checked = userSettings.generation.validateCoCoverage;
        document.getElementById('validate-difficulty-balance').checked = userSettings.generation.validateDifficultyBalance;
        document.getElementById('check-duplicate-questions').checked = userSettings.generation.checkDuplicateQuestions;
        document.getElementById('validate-total-marks').checked = userSettings.generation.validateTotalMarks;

        // Advanced settings
        document.getElementById('enable-debug-mode').checked = userSettings.advanced.enableDebugMode;
        document.getElementById('show-performance-metrics').checked = userSettings.advanced.showPerformanceMetrics;
        document.getElementById('enable-experimental-features').checked = userSettings.advanced.enableExperimentalFeatures;
        document.getElementById('encrypt-local-data').checked = userSettings.advanced.encryptLocalData;
        document.getElementById('clear-on-exit').checked = userSettings.advanced.clearOnExit;
        document.getElementById('anonymous-usage').checked = userSettings.advanced.anonymousUsage;
    }

    // Apply appearance (theme, colors, font size, sidebar width, motion) from settings
    function applyAppearanceFromSettings() {
        try {
            // Theme mode handling: light | dark | auto
            const mode = userSettings?.appearance?.themeMode || 'light';
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = mode === 'dark' || (mode === 'auto' && prefersDark);
            if (typeof applyTheme === 'function') {
                applyTheme(isDark);
            } else {
                if (isDark) { document.body.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
                else { document.body.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
            }

            // Apply brand/colors via CSS variables (non-breaking fallback)
            const root = document.documentElement;
            if (root && userSettings?.appearance) {
                root.style.setProperty('--smartqpgen-primary', userSettings.appearance.primaryColor || '#3B82F6');
                root.style.setProperty('--smartqpgen-accent', userSettings.appearance.accentColor || '#10B981');
                root.style.setProperty('--smartqpgen-warning', userSettings.appearance.warningColor || '#F59E0B');
                root.style.setProperty('--smartqpgen-danger', userSettings.appearance.dangerColor || '#EF4444');
            }

            // Apply font size
            const fontSizeMap = { 'small': '14px', 'medium': '16px', 'large': '18px', 'extra-large': '20px' };
            const chosenFontSize = fontSizeMap[userSettings?.appearance?.fontSize] || '16px';
            document.body.style.fontSize = chosenFontSize;

            // Apply sidebar width
            const sidebar = document.getElementById('sidebar');
            const sidebarWidthMap = { 'narrow': '12rem', 'normal': '16rem', 'wide': '20rem' };
            const chosenSidebarWidth = sidebarWidthMap[userSettings?.appearance?.sidebarWidth] || '16rem';
            if (sidebar) {
                sidebar.style.width = chosenSidebarWidth;
            }

            // Apply motion/animation preferences
            const reduceMotion = !!userSettings?.appearance?.reduceMotion;
            const allowAnimations = !!userSettings?.appearance?.enableAnimations;
            const allowLoading = !!userSettings?.appearance?.enableLoadingAnimations;
            const styleId = 'smartqpgen-motion-style';
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            if (reduceMotion || !allowAnimations || !allowLoading) {
                styleEl.textContent = '*{animation: none !important; transition: none !important;}';
            } else {
                styleEl.textContent = '';
            }
        } catch (e) {
            console.warn('Failed to apply appearance settings:', e);
        }
    }

    // Update storage information
    function updateStorageInfo() {
        // Get storage data
        const qpData = JSON.parse(localStorage.getItem('saved-question-papers') || '[]');
        const bankData = JSON.parse(localStorage.getItem('saved-question-banks') || '[]');
        const templateData = JSON.parse(localStorage.getItem('qp-requirements-templates') || '{}');

        // Calculate sizes
        const qpSize = JSON.stringify(qpData).length / 1024; // KB
        const bankSize = JSON.stringify(bankData).length / 1024; // KB
        const templateSize = JSON.stringify(templateData).length / 1024; // KB
        const totalSize = qpSize + bankSize + templateSize;

        // Update UI
        document.getElementById('storage-qp-count').textContent = qpData.length;
        document.getElementById('storage-qp-size').textContent = qpSize.toFixed(1) + ' KB';
        document.getElementById('storage-bank-count').textContent = bankData.length;
        document.getElementById('storage-bank-size').textContent = bankSize.toFixed(1) + ' KB';
        document.getElementById('storage-template-count').textContent = Object.keys(templateData).length;
        document.getElementById('storage-template-size').textContent = templateSize.toFixed(1) + ' KB';
        document.getElementById('total-storage-size').textContent = totalSize.toFixed(1) + ' KB';

        // Update progress bar (assuming 10MB limit)
        const progressPercent = Math.min((totalSize / (10 * 1024)) * 100, 100);
        document.getElementById('storage-progress-bar').style.width = progressPercent + '%';
    }

    // Update system information
    function updateSystemInfo() {
        // Browser info
        const browserInfo = navigator.userAgent.split(' ').pop();
        document.getElementById('browser-info').textContent = browserInfo;

        // Screen resolution
        document.getElementById('screen-resolution').textContent = `${screen.width}x${screen.height}`;

        // Storage support
        document.getElementById('storage-support').textContent = typeof (Storage) !== "undefined" ? 'Supported' : 'Not Supported';

        // Last updated (current date)
        document.getElementById('last-updated').textContent = new Date().toLocaleDateString();

        // Session duration (placeholder)
        document.getElementById('session-duration').textContent = '0:00:00';
    }

    // Make functions globally available
    window.initializeRecentContent = initializeRecentContent;
    window.initializeSettingsContent = initializeSettingsContent;

    // Setup settings event listeners
    function setupSettingsEventListeners() {
        // Tab switching
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                switchSettingsTab(tab);
            });
        });

        // Auto-save settings on change
        const settingsInputs = document.querySelectorAll('#settings-content input, #settings-content select');
        settingsInputs.forEach(input => {
            input.addEventListener('change', () => {
                updateSettingsFromUI();
                // Immediately apply appearance updates when relevant controls change
                applyAppearanceFromSettings();
                saveUserSettings();

                // Inform about backupToCloud if toggled
                if (input.id === 'backup-to-cloud') {
                    if (input.checked) {
                        displayMessageBox('Cloud backup will be used when connected. (Not configured yet)', 'info');
                    } else {
                        displayMessageBox('Cloud backup disabled. Data stays local.', 'info');
                    }
                }
            });
        });

        // Color picker updates
        document.querySelectorAll('input[type="color"]').forEach(picker => {
            picker.addEventListener('change', (e) => {
                const textInput = e.target.nextElementSibling;
                textInput.value = e.target.value;
                updateSettingsFromUI();
                saveUserSettings();
            });
        });

        // Reset buttons
        document.getElementById('reset-settings-btn').addEventListener('click', resetAllSettings);
        document.getElementById('reset-colors-btn').addEventListener('click', resetColors);
        document.getElementById('export-settings-btn').addEventListener('click', exportSettings);

        // Data management buttons
        document.getElementById('export-all-data-btn').addEventListener('click', () => exportData('all'));
        document.getElementById('export-qp-data-btn').addEventListener('click', () => exportData('qp'));
        document.getElementById('export-settings-data-btn').addEventListener('click', () => exportData('settings'));
        document.getElementById('import-data-btn').addEventListener('click', importData);
        document.getElementById('clear-all-data-btn').addEventListener('click', clearAllData);

        // Reset options
        document.getElementById('reset-settings-only-btn').addEventListener('click', () => resetData('settings'));
        document.getElementById('reset-data-only-btn').addEventListener('click', () => resetData('data'));
        document.getElementById('factory-reset-btn').addEventListener('click', () => resetData('factory'));
    }

    // Switch settings tab
    function switchSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active', 'border-gray-500', 'text-gray-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                btn.classList.remove('active', 'border-gray-500', 'text-gray-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });

        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            if (content.id === `settings-${tabName}-tab`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    // Update settings object from UI
    function updateSettingsFromUI() {
        // General settings
        userSettings.general.defaultSubject = document.getElementById('default-subject').value;
        userSettings.general.defaultDepartment = document.getElementById('default-department').value;
        userSettings.general.defaultSemester = document.getElementById('default-semester').value;
        userSettings.general.defaultAcademicYear = document.getElementById('default-academic-year').value;

        userSettings.general.notifyGenerationComplete = document.getElementById('notify-generation-complete').checked;
        userSettings.general.notifySaveSuccess = document.getElementById('notify-save-success').checked;
        userSettings.general.notifyErrors = document.getElementById('notify-errors').checked;
        userSettings.general.notifyTips = document.getElementById('notify-tips').checked;

        userSettings.general.autoSaveEnabled = document.getElementById('auto-save-enabled').checked;
        userSettings.general.autoSaveInterval = parseInt(document.getElementById('auto-save-interval').value);
        userSettings.general.backupToCloud = document.getElementById('backup-to-cloud').checked;

        // Appearance settings
        const themeMode = document.querySelector('input[name="theme-mode"]:checked');
        if (themeMode) userSettings.appearance.themeMode = themeMode.value;

        userSettings.appearance.fontSize = document.getElementById('font-size-setting').value;
        userSettings.appearance.sidebarWidth = document.getElementById('sidebar-width-setting').value;

        userSettings.appearance.enableAnimations = document.getElementById('enable-animations').checked;
        userSettings.appearance.enableHoverEffects = document.getElementById('enable-hover-effects').checked;
        userSettings.appearance.enableLoadingAnimations = document.getElementById('enable-loading-animations').checked;
        userSettings.appearance.reduceMotion = document.getElementById('reduce-motion').checked;

        userSettings.appearance.primaryColor = document.getElementById('primary-color').value;
        userSettings.appearance.accentColor = document.getElementById('accent-color').value;
        userSettings.appearance.warningColor = document.getElementById('warning-color').value;
        userSettings.appearance.dangerColor = document.getElementById('danger-color').value;

        // Generation settings
        userSettings.generation.defaultTotalMarks = parseInt(document.getElementById('default-total-marks').value);
        userSettings.generation.defaultDuration = parseFloat(document.getElementById('default-duration').value);
        userSettings.generation.defaultSelectionStrategy = document.getElementById('default-selection-strategy').value;
        userSettings.generation.defaultDifficulty = document.getElementById('default-difficulty').value;

        const defaultFormat = document.querySelector('input[name="default-format"]:checked');
        if (defaultFormat) userSettings.generation.defaultFormat = defaultFormat.value;

        userSettings.generation.includeHeader = document.getElementById('include-header').checked;
        userSettings.generation.includeInstructions = document.getElementById('include-instructions').checked;
        userSettings.generation.includeMarkingScheme = document.getElementById('include-marking-scheme').checked;
        userSettings.generation.numberQuestions = document.getElementById('number-questions').checked;

        userSettings.generation.validateBloomsTaxonomy = document.getElementById('validate-blooms-taxonomy').checked;
        userSettings.generation.validateCoCoverage = document.getElementById('validate-co-coverage').checked;
        userSettings.generation.validateDifficultyBalance = document.getElementById('validate-difficulty-balance').checked;
        userSettings.generation.checkDuplicateQuestions = document.getElementById('check-duplicate-questions').checked;
        userSettings.generation.validateTotalMarks = document.getElementById('validate-total-marks').checked;

        // Advanced settings
        userSettings.advanced.enableDebugMode = document.getElementById('enable-debug-mode').checked;
        userSettings.advanced.showPerformanceMetrics = document.getElementById('show-performance-metrics').checked;
        userSettings.advanced.enableExperimentalFeatures = document.getElementById('enable-experimental-features').checked;
        userSettings.advanced.encryptLocalData = document.getElementById('encrypt-local-data').checked;
        userSettings.advanced.clearOnExit = document.getElementById('clear-on-exit').checked;
        userSettings.advanced.anonymousUsage = document.getElementById('anonymous-usage').checked;
    }

    // Help functionality
    function initializeHelpContent() {
        setupHelpEventListeners();
        setupFAQToggle();
    }

    // Setup help event listeners
    function setupHelpEventListeners() {
        // Tab switching
        document.querySelectorAll('.help-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                switchHelpTab(tab);
            });
        });

        // Search functionality
        document.getElementById('help-search-btn').addEventListener('click', toggleHelpSearch);
        document.getElementById('help-search-input').addEventListener('input', searchHelp);
        document.getElementById('help-print-btn').addEventListener('click', printHelp);
    }

    // Switch help tab
    function switchHelpTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.help-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active', 'border-orange-500', 'text-orange-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                btn.classList.remove('active', 'border-orange-500', 'text-orange-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });

        // Update tab content
        document.querySelectorAll('.help-tab-content').forEach(content => {
            if (content.id === `help-${tabName}-tab`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    // Setup FAQ toggle functionality
    function setupFAQToggle() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const icon = question.querySelector('i');

                if (answer.classList.contains('hidden')) {
                    answer.classList.remove('hidden');
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    answer.classList.add('hidden');
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
        });
    }

    // Toggle help search
    function toggleHelpSearch() {
        const searchBox = document.getElementById('help-search-box');
        searchBox.classList.toggle('hidden');
        if (!searchBox.classList.contains('hidden')) {
            document.getElementById('help-search-input').focus();
        }
    }

    // Search help content
    function searchHelp() {
        const query = document.getElementById('help-search-input').value.toLowerCase();
        const resultsContainer = document.getElementById('help-search-results');

        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // Simple search implementation
        const searchResults = [];
        const helpContent = document.getElementById('help-content');
        const textNodes = helpContent.querySelectorAll('p, li, h4, h5');

        textNodes.forEach(node => {
            if (node.textContent.toLowerCase().includes(query)) {
                searchResults.push({
                    text: node.textContent.substring(0, 100) + '...',
                    element: node
                });
            }
        });

        if (searchResults.length > 0) {
            resultsContainer.innerHTML = `
                        <h5 class="font-medium text-gray-800 mb-2">Search Results (${searchResults.length})</h5>
                        <div class="space-y-2">
                            ${searchResults.slice(0, 5).map(result => `
                                <div class="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100" onclick="scrollToElement(this.dataset.target)">
                                    <p class="text-sm text-gray-700">${result.text}</p>
                                </div>
                            `).join('')}
                        </div>
                    `;
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.innerHTML = '<p class="text-sm text-gray-500">No results found.</p>';
            resultsContainer.classList.remove('hidden');
        }
    }

    // Print help guide
    function printHelp() {
        window.print();
    }

    // Utility functions for settings
    function resetAllSettings() {
        if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
            localStorage.removeItem('smartqpgen-settings');
            location.reload();
        }
    }

    function resetColors() {
        userSettings.appearance.primaryColor = '#3B82F6';
        userSettings.appearance.accentColor = '#10B981';
        userSettings.appearance.warningColor = '#F59E0B';
        userSettings.appearance.dangerColor = '#EF4444';
        updateSettingsUI();
        saveUserSettings();
    }

    function exportSettings() {
        const dataStr = JSON.stringify(userSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `smartqpgen_settings_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        displayMessageBox('✅ Settings exported successfully!', 'success');
    }

    function exportData(type) {
        let data = {};
        let filename = '';

        switch (type) {
            case 'all':
                data = {
                    questionPapers: JSON.parse(localStorage.getItem('saved-question-papers') || '[]'),
                    questionBanks: JSON.parse(localStorage.getItem('saved-question-banks') || '[]'),
                    templates: JSON.parse(localStorage.getItem('qp-requirements-templates') || '{}'),
                    recentQPs: JSON.parse(localStorage.getItem('recent-generated-qps') || '[]'),
                    settings: userSettings
                };
                filename = 'smartqpgen_all_data';
                break;
            case 'qp':
                data = {
                    questionPapers: JSON.parse(localStorage.getItem('saved-question-papers') || '[]'),
                    recentQPs: JSON.parse(localStorage.getItem('recent-generated-qps') || '[]')
                };
                filename = 'smartqpgen_question_papers';
                break;
            case 'settings':
                data = userSettings;
                filename = 'smartqpgen_settings';
                break;
        }

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        displayMessageBox(`✅ ${type === 'all' ? 'All data' : type === 'qp' ? 'Question papers' : 'Settings'} exported successfully!`, 'success');
    }

    function importData() {
        document.getElementById('import-data-file').click();

        document.getElementById('import-data-file').onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const data = JSON.parse(event.target.result);

                    if (confirm('This will overwrite existing data. Are you sure you want to continue?')) {
                        // Import data based on structure
                        if (data.questionPapers) localStorage.setItem('saved-question-papers', JSON.stringify(data.questionPapers));
                        if (data.questionBanks) localStorage.setItem('saved-question-banks', JSON.stringify(data.questionBanks));
                        if (data.templates) localStorage.setItem('qp-requirements-templates', JSON.stringify(data.templates));
                        if (data.recentQPs) localStorage.setItem('recent-generated-qps', JSON.stringify(data.recentQPs));
                        if (data.settings) localStorage.setItem('smartqpgen-settings', JSON.stringify(data.settings));

                        displayMessageBox('✅ Data imported successfully! Refreshing page...', 'success');
                        setTimeout(() => location.reload(), 2000);
                    }
                } catch (error) {
                    displayMessageBox('❌ Invalid file format. Please select a valid JSON file.', 'error');
                }
            };
            reader.readAsText(file);
        };
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This action cannot be undone and will remove all question papers, banks, templates, and settings.')) {
            if (confirm('This is your final warning. All data will be permanently deleted. Continue?')) {
                localStorage.clear();
                displayMessageBox('✅ All data cleared successfully! Refreshing page...', 'success');
                setTimeout(() => location.reload(), 2000);
            }
        }
    }

    function resetData(type) {
        let message = '';
        let action = null;

        switch (type) {
            case 'settings':
                message = 'Are you sure you want to reset all settings to default?';
                action = () => {
                    localStorage.removeItem('smartqpgen-settings');
                    location.reload();
                };
                break;
            case 'data':
                message = 'Are you sure you want to clear all question papers, banks, and templates?';
                action = () => {
                    localStorage.removeItem('saved-question-papers');
                    localStorage.removeItem('saved-question-banks');
                    localStorage.removeItem('qp-requirements-templates');
                    localStorage.removeItem('recent-generated-qps');
                    location.reload();
                };
                break;
            case 'factory':
                message = 'Are you sure you want to perform a factory reset? This will clear ALL data and settings.';
                action = () => {
                    localStorage.clear();
                    location.reload();
                };
                break;
        }

        if (confirm(message)) {
            if (confirm('This action cannot be undone. Continue?')) {
                action();
            }
        }
    }

    // --- HOD Dashboard Functionality ---

    // Initialize HOD dashboard when shown
    function initializeHODDashboard() {
        loadHODData();
        setupHODDashboardEventListeners(); // Renamed to avoid confusion
        updateHODStatistics();
        renderHODContent();
        loadPendingApprovals(); // Load approval data
    }

    // Load HOD data from backend
    async function loadHODData() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                console.error('User not authenticated for HOD data');
                return;
            }

            const idToken = await user.getIdToken();

            // Load pending approvals
            const response = await fetch('/get_pending_approvals', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                hodQuestionPapers = data.approvals || [];
                console.log('Loaded HOD data from backend:', hodQuestionPapers.length, 'papers');
            } else {
                console.error('Failed to load HOD data:', await response.text());
                hodQuestionPapers = [];
            }
        } catch (error) {
            console.error('Error loading HOD data:', error);
            hodQuestionPapers = [];
        }
    }

    // No more sample HOD data - load real data from backend

    // No more sample faculty data - load real data from backend

    // Sample data generation removed - using real backend data

    // Update HOD statistics
    function updateHODStatistics() {
        const pendingCount = hodQuestionPapers.filter(paper => paper.status === 'pending').length;
        const approvedCount = hodQuestionPapers.filter(paper => paper.status === 'approved').length;
        const revisionCount = hodQuestionPapers.filter(paper => paper.status === 'revision').length;
        const facultyCount = facultyList.length;

        document.getElementById('hod-pending-count').textContent = pendingCount;
        document.getElementById('hod-approved-count').textContent = approvedCount;
        document.getElementById('hod-revision-count').textContent = revisionCount;
        document.getElementById('hod-faculty-count').textContent = facultyCount;

        // Update tab counts
        document.getElementById('tab-pending-count').textContent = pendingCount;
        document.getElementById('tab-approved-count').textContent = approvedCount;
        document.getElementById('tab-revision-count').textContent = revisionCount;
    }

    // Make functions globally available
    window.initializeHelpContent = initializeHelpContent;
    window.initializeSettingsContent = initializeSettingsContent;
    // --- HOD Approval Management Functions ---

    // Load pending approvals
    async function loadPendingApprovals() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                console.error('User not authenticated');
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/get_pending_approvals', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                renderApprovalsList(data.approvals);
                updateApprovalStatistics(data.approvals);
            } else {
                console.error('Failed to load pending approvals:', await response.text());
                showNoApprovalsMessage();
            }
        } catch (error) {
            console.error('Error loading pending approvals:', error);
            showNoApprovalsMessage();
        }
    }

    // Render approvals list
    function renderApprovalsList(approvals) {
        const approvalsList = document.getElementById('approvals-list');
        const noApprovalsMessage = document.getElementById('no-approvals-message');

        if (!approvalsList) return;

        if (!approvals || approvals.length === 0) {
            approvalsList.innerHTML = '';
            if (noApprovalsMessage) {
                noApprovalsMessage.classList.remove('hidden');
            }
            return;
        }

        if (noApprovalsMessage) {
            noApprovalsMessage.classList.add('hidden');
        }

        approvalsList.innerHTML = approvals.map(approval => createApprovalCard(approval)).join('');
    }

    // Create approval card
    function createApprovalCard(approval) {
        const submittedDate = new Date(approval.submitted_at?.seconds * 1000).toLocaleString();
        const priorityClass = getPriorityClass(approval.priority);
        const statusClass = getStatusClass(approval.status);

        return `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <div class="flex items-center space-x-3 mb-2">
                                    <h5 class="font-semibold text-gray-800">${approval.paper_name}</h5>
                                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                                        ${approval.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span class="px-2 py-1 rounded-full text-xs font-medium ${priorityClass}">
                                        ${approval.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-600 space-y-1">
                                    <p><strong>Faculty:</strong> ${approval.faculty_name}</p>
                                    <p><strong>Subject:</strong> ${approval.subject}</p>
                                    <p><strong>Pattern:</strong> ${approval.pattern.toUpperCase()}</p>
                                    <p><strong>Submitted:</strong> ${submittedDate}</p>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="viewApprovalDetails('${approval.id}')" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                                    <i class="fas fa-eye mr-1"></i>View
                                </button>
                                ${approval.status === 'pending_approval' ? `
                                    <button onclick="approvePaper('${approval.id}')" class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                                        <i class="fas fa-check mr-1"></i>Approve
                                    </button>
                                    <button onclick="requestRevision('${approval.id}')" class="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm">
                                        <i class="fas fa-edit mr-1"></i>Request Revision
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${approval.faculty_comments ? `
                            <div class="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p class="text-sm text-blue-800"><strong>Faculty Comments:</strong> ${approval.faculty_comments}</p>
                            </div>
                        ` : ''}
                        
                        ${approval.hod_comments ? `
                            <div class="mt-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                                <p class="text-sm text-purple-800"><strong>HOD Comments:</strong> ${approval.hod_comments}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
    }

    // Get priority class for styling
    function getPriorityClass(priority) {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Get status class for styling
    function getStatusClass(status) {
        switch (status) {
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'revision_requested': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Update approval statistics
    function updateApprovalStatistics(approvals) {
        const pendingCount = approvals.filter(a => a.status === 'pending_approval').length;
        const approvedCount = approvals.filter(a => a.status === 'approved').length;
        const revisionCount = approvals.filter(a => a.status === 'revision_requested').length;

        const pendingElement = document.getElementById('hod-pending-count');
        const approvedElement = document.getElementById('hod-approved-count');
        const revisionElement = document.getElementById('hod-revision-count');

        if (pendingElement) pendingElement.textContent = pendingCount;
        if (approvedElement) approvedElement.textContent = approvedCount;
        if (revisionElement) revisionElement.textContent = revisionCount;
    }

    // Show no approvals message
    function showNoApprovalsMessage() {
        const approvalsList = document.getElementById('approvals-list');
        const noApprovalsMessage = document.getElementById('no-approvals-message');

        if (approvalsList) approvalsList.innerHTML = '';
        if (noApprovalsMessage) noApprovalsMessage.classList.remove('hidden');
    }

    // Approve paper
    async function approvePaper(approvalId) {
        const comments = prompt('Add approval comments (optional):');
        if (comments === null) return; // User cancelled

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox('Please log in to approve papers.', 'error');
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/approve_paper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    approval_id: approvalId,
                    comments: comments
                })
            });

            const data = await response.json();
            if (response.ok) {
                displayMessageBox(data.message, 'success');
                loadPendingApprovals(); // Refresh the list
            } else {
                displayMessageBox(data.error || 'Failed to approve paper', 'error');
            }
        } catch (error) {
            console.error('Error approving paper:', error);
            displayMessageBox('Failed to approve paper. Please try again.', 'error');
        }
    }

    // Request revision
    async function requestRevision(approvalId) {
        const comments = prompt('Add revision comments:');
        if (!comments || comments.trim() === '') {
            displayMessageBox('Please provide revision comments.', 'warning');
            return;
        }

        const revisionType = prompt('Revision type (minor/major/complete_rewrite):', 'minor');
        if (!revisionType) return;

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) {
                displayMessageBox('Please log in to request revisions.', 'error');
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/request_revision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    approval_id: approvalId,
                    comments: comments,
                    revision_type: revisionType
                })
            });

            const data = await response.json();
            if (response.ok) {
                displayMessageBox(data.message, 'success');
                loadPendingApprovals(); // Refresh the list
            } else {
                displayMessageBox(data.error || 'Failed to request revision', 'error');
            }
        } catch (error) {
            console.error('Error requesting revision:', error);
            displayMessageBox('Failed to request revision. Please try again.', 'error');
        }
    }

    // View approval details
    function viewApprovalDetails(approvalId) {
        // This would open a detailed view modal
        displayMessageBox('Detailed view functionality coming soon!', 'info');
    }

    // Make functions globally available
    window.approvePaper = approvePaper;
    window.requestRevision = requestRevision;
    window.viewApprovalDetails = viewApprovalDetails;

    window.initializeHODDashboard = initializeHODDashboard;
    window.switchToHODView = switchToHODView;
    window.switchToFacultyView = switchToFacultyView;
    window.setupRoleSwitchingListeners = setupRoleSwitchingListeners;

    // Role switching functionality
    function switchToHODView() {
        try {
            console.log('Switching to HOD view...');
            currentUserRole = 'hod';
            updateUserInterface();

            // Update user display
            const roleBadge = document.getElementById('user-role-badge');
            if (roleBadge) {
                roleBadge.innerHTML = '<i class="fas fa-crown mr-1"></i>HOD';
                roleBadge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';
            }

            // Update dropdown
            const switchToHOD = document.getElementById('switch-to-hod-view');
            const switchToFaculty = document.getElementById('switch-to-faculty-view');
            if (switchToHOD) switchToHOD.classList.add('hidden');
            if (switchToFaculty) switchToFaculty.classList.remove('hidden');

            // Show HOD content
            const hodContent = document.getElementById('hod-dashboard-content');
            if (hodContent && typeof showContent === 'function') {
                showContent(hodContent, 'HOD Dashboard');
            } else {
                // Fallback: show content manually
                document.querySelectorAll('#main-canvas > div').forEach(div => div.classList.add('hidden'));
                if (hodContent) hodContent.classList.remove('hidden');
                const title = document.getElementById('current-view-title');
                if (title) title.textContent = 'HOD Dashboard';
            }

            displayMessageBox('✅ Switched to HOD view successfully!', 'success');
            console.log('HOD view activated successfully');
        } catch (error) {
            console.error('Error switching to HOD view:', error);
            displayMessageBox('❌ Error switching to HOD view. Check console for details.', 'error');
        }
    }

    function switchToFacultyView() {
        currentUserRole = 'faculty';
        updateUserInterface();
        showContent(welcomeContent, 'Dashboard');

        // Update user display
        document.getElementById('user-role-badge').innerHTML = '<i class="fas fa-user mr-1"></i>Faculty';
        document.getElementById('user-role-badge').className = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';

        // Update dropdown
        document.getElementById('switch-to-faculty-view').classList.add('hidden');
        document.getElementById('switch-to-hod-view').classList.remove('hidden');

        displayMessageBox('✅ Switched to Faculty view successfully!', 'success');
    }

    // Update UI based on current role
    function updateUserInterface() {
        // This function can be expanded to show/hide different menu items based on role
        if (currentUserRole === 'hod') {
            // HOD-specific UI updates
            console.log('HOD interface activated');
        } else {
            // Faculty-specific UI updates
            console.log('Faculty interface activated');
        }
    }

    // Setup role switching event listeners (called immediately on page load)
    function setupRoleSwitchingListeners() {
        // Role switching
        const switchToHODBtn = document.getElementById('switch-to-hod-view');
        const switchToFacultyBtn = document.getElementById('switch-to-faculty-view');

        if (switchToHODBtn) {
            switchToHODBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Switch to HOD clicked'); // Debug log
                switchToHODView();
            });
        }

        if (switchToFacultyBtn) {
            switchToFacultyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Switch to Faculty clicked'); // Debug log
                switchToFacultyView();
            });
        }
    }

    // Setup HOD dashboard event listeners (called when HOD dashboard is shown)
    function setupHODDashboardEventListeners() {
        // HOD tab switching
        document.querySelectorAll('.hod-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                switchHODTab(tab);
            });
        });

        // Search and filters
        const searchInput = document.getElementById('hod-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                currentHODPage = 1;
                renderHODContent();
            }, 300));
        }

        const statusFilter = document.getElementById('hod-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                currentHODFilter = e.target.value;
                currentHODPage = 1;
                renderHODContent();
            });
        }

        const facultyFilter = document.getElementById('hod-faculty-filter');
        if (facultyFilter) {
            // Populate faculty filter options
            facultyFilter.innerHTML = '<option value="all">All Faculty</option>' +
                facultyList.map(faculty => `<option value="${faculty.id}">${faculty.name}</option>`).join('');

            facultyFilter.addEventListener('change', (e) => {
                currentHODPage = 1;
                renderHODContent();
            });
        }

        const sortSelect = document.getElementById('hod-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                renderHODContent();
            });
        }

        // Header buttons
        document.getElementById('hod-refresh-btn').addEventListener('click', () => {
            loadHODData();
            updateHODStatistics();
            renderHODContent();
            displayMessageBox('✅ HOD dashboard refreshed!', 'success');
        });

        document.getElementById('hod-reports-btn').addEventListener('click', () => {
            showModal('hod-reports-modal');
        });

        document.getElementById('hod-settings-btn').addEventListener('click', () => {
            displayMessageBox('🔧 HOD settings coming soon!', 'info');
        });
    }

    // Switch HOD tab
    function switchHODTab(tabName) {
        currentHODTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.hod-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active', 'border-purple-500', 'text-purple-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                btn.classList.remove('active', 'border-purple-500', 'text-purple-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });

        // Show/hide content based on tab
        if (tabName === 'faculty') {
            document.getElementById('hod-papers-list').classList.add('hidden');
            document.getElementById('hod-faculty-management').classList.remove('hidden');
            renderFacultyManagement();
        } else {
            document.getElementById('hod-faculty-management').classList.add('hidden');
            document.getElementById('hod-papers-list').classList.remove('hidden');
            renderHODContent();
        }
    }

    // Render HOD content based on current tab and filters
    function renderHODContent() {
        if (currentHODTab === 'faculty') {
            renderFacultyManagement();
            return;
        }

        const filteredPapers = getFilteredHODPapers();
        const startIndex = (currentHODPage - 1) * hodItemsPerPage;
        const endIndex = startIndex + hodItemsPerPage;
        const pagePapers = filteredPapers.slice(startIndex, endIndex);

        const container = document.getElementById('hod-papers-list');
        const emptyState = document.getElementById('hod-empty');

        if (filteredPapers.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = pagePapers.map(paper => createHODPaperCard(paper)).join('');

        // Add event listeners to paper cards
        addHODPaperEventListeners();
    }

    // Get filtered HOD papers
    function getFilteredHODPapers() {
        let filtered = [...hodQuestionPapers];

        // Filter by tab
        if (currentHODTab !== 'all') {
            filtered = filtered.filter(paper => paper.status === currentHODTab);
        }

        // Filter by status
        if (currentHODFilter !== 'all') {
            filtered = filtered.filter(paper => paper.status === currentHODFilter);
        }

        // Filter by faculty
        const facultyFilter = document.getElementById('hod-faculty-filter');
        if (facultyFilter && facultyFilter.value !== 'all') {
            const selectedFaculty = facultyList.find(f => f.id === facultyFilter.value);
            if (selectedFaculty) {
                filtered = filtered.filter(paper => paper.facultyName === selectedFaculty.name);
            }
        }

        // Apply search
        const searchTerm = document.getElementById('hod-search').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(paper =>
                paper.facultyName.toLowerCase().includes(searchTerm) ||
                paper.subject.toLowerCase().includes(searchTerm) ||
                paper.paperName.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        const sortValue = document.getElementById('hod-sort').value;
        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'date-desc':
                    return new Date(b.submittedDate) - new Date(a.submittedDate);
                case 'date-asc':
                    return new Date(a.submittedDate) - new Date(b.submittedDate);
                case 'priority-desc':
                    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'faculty-asc':
                    return a.facultyName.localeCompare(b.facultyName);
                case 'subject-asc':
                    return a.subject.localeCompare(b.subject);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Create HOD paper card
    function createHODPaperCard(paper) {
        const statusColor = getHODStatusColor(paper.status);
        const priorityColor = getPriorityColor(paper.priority);
        const formattedDate = new Date(paper.submittedDate).toLocaleDateString();
        const formattedTime = new Date(paper.submittedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
                    <div class="hod-paper-card bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 border border-gray-200" data-paper-id="${paper.id}">
                        <div class="flex items-start justify-between">
                            <div class="flex items-start space-x-4 flex-1">
                                <div class="bg-purple-100 rounded-lg p-3">
                                    <i class="fas fa-file-alt text-purple-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-lg font-semibold text-gray-900 truncate">${paper.paperName}</h4>
                                    <p class="text-gray-600 text-sm mb-2">by ${paper.facultyName} • ${paper.subject}</p>
                                    <div class="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                        <span class="flex items-center">
                                            <i class="fas fa-calendar-alt mr-1"></i>
                                            ${formattedDate} at ${formattedTime}
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-clock mr-1"></i>
                                            ${paper.duration}h
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-star mr-1"></i>
                                            ${paper.totalMarks} marks
                                        </span>
                                        <span class="flex items-center">
                                            <i class="fas fa-question-circle mr-1"></i>
                                            ${paper.questionCount} questions
                                        </span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">
                                            ${getStatusIcon(paper.status)} ${paper.status.charAt(0).toUpperCase() + paper.status.slice(1)}
                                        </span>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800">
                                            ${getPriorityIcon(paper.priority)} ${paper.priority.charAt(0).toUpperCase() + paper.priority.slice(1)}
                                        </span>
                                        ${paper.comments ? `<span class="text-xs text-blue-600"><i class="fas fa-comment mr-1"></i>Has Comments</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 ml-4">
                                <button class="review-paper-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200" title="Review Paper">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${paper.status === 'pending' ? `
                                    <button class="quick-approve-btn p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors duration-200" title="Quick Approve">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="quick-revision-btn p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-md transition-colors duration-200" title="Request Revision">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                ` : ''}
                                <button class="download-paper-btn p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors duration-200" title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        ${paper.comments ? `
                            <div class="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p class="text-sm text-blue-800"><strong>HOD Comments:</strong> ${paper.comments}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
    }

    // Get status color
    function getHODStatusColor(status) {
        switch (status) {
            case 'pending': return 'yellow';
            case 'approved': return 'green';
            case 'revision': return 'orange';
            case 'rejected': return 'red';
            default: return 'gray';
        }
    }

    // Get priority color
    function getPriorityColor(priority) {
        switch (priority) {
            case 'urgent': return 'red';
            case 'high': return 'orange';
            case 'medium': return 'yellow';
            case 'low': return 'green';
            default: return 'gray';
        }
    }

    // Get status icon
    function getStatusIcon(status) {
        switch (status) {
            case 'pending': return '<i class="fas fa-clock mr-1"></i>';
            case 'approved': return '<i class="fas fa-check-circle mr-1"></i>';
            case 'revision': return '<i class="fas fa-edit mr-1"></i>';
            case 'rejected': return '<i class="fas fa-times-circle mr-1"></i>';
            default: return '<i class="fas fa-question mr-1"></i>';
        }
    }

    // Get priority icon
    function getPriorityIcon(priority) {
        switch (priority) {
            case 'urgent': return '<i class="fas fa-exclamation-triangle mr-1"></i>';
            case 'high': return '<i class="fas fa-arrow-up mr-1"></i>';
            case 'medium': return '<i class="fas fa-minus mr-1"></i>';
            case 'low': return '<i class="fas fa-arrow-down mr-1"></i>';
            default: return '<i class="fas fa-circle mr-1"></i>';
        }
    }

    // Quick approve paper
    function quickApprovePaper(paperId) {
        const paper = hodQuestionPapers.find(p => p.id === paperId);
        if (!paper) return;

        paper.status = 'approved';
        paper.reviewedDate = new Date().toISOString();
        paper.comments = 'Quick approved by HOD';

        saveHODData();
        updateHODStatistics();
        renderHODContent();
        displayMessageBox(`✅ Paper "${paper.paperName}" approved successfully!`, 'success');
    }

    // Quick request revision
    function quickRequestRevision(paperId) {
        const paper = hodQuestionPapers.find(p => p.id === paperId);
        if (!paper) return;

        const comment = prompt('Please provide revision comments:');
        if (comment) {
            paper.status = 'revision';
            paper.reviewedDate = new Date().toISOString();
            paper.comments = comment;

            saveHODData();
            updateHODStatistics();
            renderHODContent();
            displayMessageBox(`✅ Revision requested for "${paper.paperName}"!`, 'success');
        }
    }

    // Download paper
    function downloadPaper(paperId) {
        const paper = hodQuestionPapers.find(p => p.id === paperId);
        if (!paper) return;

        const dataStr = JSON.stringify(paper, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${paper.paperName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        displayMessageBox(`✅ "${paper.paperName}" downloaded successfully!`, 'success');
    }

    // Save HOD data
    function saveHODData() {
        localStorage.setItem('hod-question-papers', JSON.stringify(hodQuestionPapers));
        localStorage.setItem('hod-faculty-list', JSON.stringify(facultyList));
    }

    // Close HOD modal
    window.closeHODModal = function (modalId) {
        document.getElementById(modalId).classList.add('hidden');
    };

    // Render faculty management
    function renderFacultyManagement() {
        // Update faculty statistics
        document.getElementById('active-faculty-count').textContent = facultyList.length;
        document.getElementById('monthly-papers-count').textContent = hodQuestionPapers.filter(p => {
            const paperDate = new Date(p.submittedDate);
            const now = new Date();
            return paperDate.getMonth() === now.getMonth() && paperDate.getFullYear() === now.getFullYear();
        }).length;

        const avgReviewTime = facultyList.reduce((sum, faculty) => {
            return sum + parseFloat(faculty.avgReviewTime.replace(/[^0-9.]/g, ''));
        }, 0) / facultyList.length;
        document.getElementById('avg-review-time').textContent = avgReviewTime.toFixed(1) + 'h';

        // Render faculty performance list
        const performanceContainer = document.getElementById('faculty-performance-list');
        performanceContainer.innerHTML = facultyList.map(faculty => `
                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <div class="flex justify-between items-start">
                            <div>
                                <h5 class="font-semibold text-gray-900">${faculty.name}</h5>
                                <p class="text-sm text-gray-600">${faculty.specialization}</p>
                                <p class="text-xs text-gray-500">${faculty.email}</p>
                            </div>
                            <div class="text-right">
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPerformanceBadgeClass(faculty.performance)}">
                                    ${faculty.performance.charAt(0).toUpperCase() + faculty.performance.slice(1)}
                                </span>
                            </div>
                        </div>
                        <div class="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div class="text-center">
                                <p class="font-semibold text-blue-600">${faculty.papersSubmitted}</p>
                                <p class="text-gray-500">Submitted</p>
                            </div>
                            <div class="text-center">
                                <p class="font-semibold text-green-600">${faculty.papersApproved}</p>
                                <p class="text-gray-500">Approved</p>
                            </div>
                            <div class="text-center">
                                <p class="font-semibold text-yellow-600">${faculty.avgReviewTime}</p>
                                <p class="text-gray-500">Avg Review</p>
                            </div>
                        </div>
                    </div>
                `).join('');
    }

    // Get performance badge class
    function getPerformanceBadgeClass(performance) {
        switch (performance) {
            case 'excellent': return 'bg-green-100 text-green-800';
            case 'good': return 'bg-blue-100 text-blue-800';
            case 'average': return 'bg-yellow-100 text-yellow-800';
            case 'developing': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Initialize dashboard if welcome content is visible
    if (typeof initializeCoolDashboard === 'function') {
        initializeCoolDashboard();
    }
});

// --- User Profile & Department Logic (Appended) ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User signed in (Profile Update):', user.email);
                await updateUserProfileUI(user);
            }
        });
    }
});

async function updateUserProfileUI(user) {
    try {
        const idToken = await user.getIdToken();
        const response = await fetch('/get_user_profile', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('User Profile Data:', userData);

            // Update Dropdown
            const dropdownUsername = document.getElementById('dropdown-username');
            const dropdownEmail = document.getElementById('dropdown-email');
            const userDepartment = document.getElementById('user-department');
            const userRoleBadge = document.getElementById('user-role-badge');
            const accountInitial = document.getElementById('account-initial');
            const userNameDisplay = document.getElementById('user-name-display');

            if (dropdownUsername) dropdownUsername.textContent = userData.name || user.displayName || 'User';
            if (dropdownEmail) dropdownEmail.textContent = userData.email || user.email;

            if (userDepartment) {
                // Update department text
                userDepartment.textContent = userData.department || 'N/A';
            }

            if (userRoleBadge) {
                userRoleBadge.innerHTML = `<i class="fas fa-user mr-1"></i>${userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Faculty'}`;
            }

            if (accountInitial) {
                const name = userData.name || user.displayName || 'U';
                accountInitial.textContent = name.charAt(0).toUpperCase();
            }

            if (userNameDisplay) {
                userNameDisplay.textContent = userData.name || user.displayName || 'User';
            }

            // Store global user role
            window.currentUserRole = userData.role || 'faculty';
            window.currentUserDepartment = userData.department;

        } else {
            console.error('Failed to fetch user profile');
        }
    } catch (error) {
        console.error('Error updating user profile UI:', error);
    }
}
