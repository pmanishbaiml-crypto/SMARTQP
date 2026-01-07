// HOD Dashboard Logic
let hodUser = null;
let hodApprovals = [];
let papersChart = null;

document.addEventListener('DOMContentLoaded', async function () {
    console.log('HOD Dashboard: Initializing...');

    // Show loading state if possible

    // Initialize Firebase if not already done (handled in HTML for now to keep config secure/central)
    // Wait for Firebase
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check Local Storage
    const storedUser = localStorage.getItem('hodUser');
    if (!storedUser) {
        window.location.href = '/hod-login';
        return;
    }
    hodUser = JSON.parse(storedUser);
    updateUserInfo();

    // Auth Listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await checkHODAuthentication(user);
            loadRealData();
        } else {
            window.location.href = '/hod-login';
        }
    });

    setupNavigation();
    setupLogout();
});

async function checkHODAuthentication(user) {
    try {
        const idToken = await user.getIdToken();
        const response = await fetch('/verify_hod', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });

        if (!response.ok) throw new Error('Verification failed');

        const data = await response.json();
        if (!data.isHOD) throw new Error('Not authorized');

        hodUser = data.user;
        localStorage.setItem('hodUser', JSON.stringify(hodUser));
        updateUserInfo();
    } catch (error) {
        console.error('Auth Error:', error);
        window.location.href = '/hod-login';
    }
}

function updateUserInfo() {
    if (hodUser) {
        document.getElementById('hod-name').textContent = hodUser.name;
        document.getElementById('hod-department').textContent = hodUser.department;
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Active state
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');

            // Show section
            const sectionId = link.getAttribute('data-section');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${sectionId}-content`).classList.add('active');
        });
    });
}

function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await auth.signOut();
        localStorage.removeItem('hodUser');
        window.location.href = '/hod-login';
    });
}

async function loadRealData() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();

        const response = await fetch('/get_pending_approvals', {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            hodApprovals = data.approvals || [];

            updateDashboardStats();
            updateTables();
            initChart();
        }
    } catch (error) {
        console.error('Data Load Error:', error);
    }
}

function updateDashboardStats() {
    const pending = hodApprovals.filter(a => a.status === 'pending').length;
    const approved = hodApprovals.filter(a => a.status === 'approved').length;
    const revision = hodApprovals.filter(a => a.status === 'rejected').length;
    const faculty = new Set(hodApprovals.map(a => a.faculty_uid)).size;

    // Update Cards
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-revision').textContent = revision;
    document.getElementById('stat-faculty').textContent = faculty;

    // Update Sidebar Badges
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('revision-count').textContent = revision;
    document.getElementById('faculty-count').textContent = faculty;
}

function updateTables() {
    // Recent Activity
    const recent = [...hodApprovals].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 5);
    renderTable('activity-table-body', recent, renderActivityRow);

    // Pending
    renderTable('pending-papers-table', hodApprovals.filter(a => a.status === 'pending'), renderPendingRow);

    // Approved
    renderTable('approved-papers-table', hodApprovals.filter(a => a.status === 'approved'), renderApprovedRow);

    // Revision
    renderTable('revision-papers-table', hodApprovals.filter(a => a.status === 'rejected'), renderRevisionRow);
}

function renderTable(elementId, data, rowRenderer) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: #64748b;">No records found</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(rowRenderer).join('');
}

function renderActivityRow(item) {
    const date = new Date(item.submitted_at).toLocaleDateString();
    let statusClass = 'pending';
    if (item.status === 'approved') statusClass = 'approved';
    if (item.status === 'rejected') statusClass = 'revision';

    return `
        <tr>
            <td>
                <div style="font-weight: 500;">${item.faculty_name}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${item.faculty_email}</div>
            </td>
            <td>${item.paper_name}</td>
            <td>${item.subject}</td>
            <td>${date}</td>
            <td><span class="status-pill ${statusClass}">${item.status}</span></td>
        </tr>
    `;
}

function renderPendingRow(item) {
    const date = new Date(item.submitted_at).toLocaleDateString();
    return `
        <tr>
            <td>
                <div style="font-weight: 500;">${item.faculty_name}</div>
            </td>
            <td>${item.paper_name}</td>
            <td>${item.subject}</td>
            <td>${date}</td>
            <td><span class="status-pill pending">Pending</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-success" onclick="approvePaper('${item.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="requestRevision('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="viewPaper('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function renderApprovedRow(item) {
    const date = new Date(item.reviewed_at || item.submitted_at).toLocaleDateString();
    return `
        <tr>
            <td>${item.faculty_name}</td>
            <td>${item.paper_name}</td>
            <td>${item.subject}</td>
            <td>${date}</td>
            <td><span class="status-pill approved">Approved</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewPaper('${item.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `;
}

function renderRevisionRow(item) {
    const date = new Date(item.reviewed_at || item.submitted_at).toLocaleDateString();
    return `
        <tr>
            <td>${item.faculty_name}</td>
            <td>${item.paper_name}</td>
            <td>${item.subject}</td>
            <td>${date}</td>
            <td>${item.hod_comments || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewPaper('${item.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `;
}

// Actions
async function approvePaper(id) {
    if (!confirm('Approve this paper?')) return;

    try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/approve_paper', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ approval_id: id })
        });

        if (res.ok) {
            loadRealData();
            // Optional: Show toast
        } else {
            alert('Failed to approve');
        }
    } catch (e) {
        console.error(e);
        alert('Error approving paper');
    }
}

async function requestRevision(id) {
    const comments = prompt('Enter revision comments:');
    if (!comments) return;

    try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/request_revision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                approval_id: id,
                comments: comments,
                revision_type: 'minor'
            })
        });

        if (res.ok) {
            loadRealData();
        } else {
            alert('Failed to request revision');
        }
    } catch (e) {
        console.error(e);
        alert('Error requesting revision');
    }
}

async function viewPaper(id) {
    let paper = hodApprovals.find(p => p.id === id);
    if (!paper) return;

    // Check if we need to fetch full details (if questions are missing/empty but should exist)
    // Note: We assume if questions is empty array, it MIGHT be because of optimized fetch. 
    // Ideally we check a flag, but for now checking length 0 is a heuristic if we know papers usually have questions.
    // Or better, we always fetch if we suspect it's incomplete. 

    // Let's show a loading state first
    const loadingModal = document.createElement('div');
    loadingModal.id = 'loading-modal';
    loadingModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; justify-content: center; align-items: center;
        color: white; font-size: 1.5rem;
    `;
    loadingModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading details...';
    document.body.appendChild(loadingModal);

    try {
        if (!paper.questions || paper.questions.length === 0) {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`/get_approval_details/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const fullData = await response.json();
                // Update local cache
                Object.assign(paper, fullData);
            } else {
                console.error('Failed to fetch details');
            }
        }
    } catch (e) {
        console.error('Error fetching details:', e);
    } finally {
        if (document.getElementById('loading-modal')) {
            document.getElementById('loading-modal').remove();
        }
    }

    // Create Modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(4px);
    `;

    // Generate Questions HTML (Simplified for brevity, can be expanded)
    let questionsHtml = '<div style="padding: 20px; text-align: center; color: #64748b;">No questions available</div>';
    if (paper.questions && paper.questions.length > 0) {
        questionsHtml = paper.questions.map((q, i) => `
            <div style="margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Q${i + 1} (Module ${q.module || '?'})</div>
                ${renderQuestionContent(q)}
            </div>
        `).join('');
    }

    modal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 800px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
            <div style="padding: 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">${paper.paper_name}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            <div style="padding: 24px; overflow-y: auto; flex: 1;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div><span style="color: #64748b; font-size: 0.875rem;">Subject</span><div style="font-weight: 500;">${paper.subject}</div></div>
                    <div><span style="color: #64748b; font-size: 0.875rem;">Faculty</span><div style="font-weight: 500;">${paper.faculty_name}</div></div>
                    <div><span style="color: #64748b; font-size: 0.875rem;">Total Marks</span><div style="font-weight: 500;">${paper.total_marks || 100}</div></div>
                    <div><span style="color: #64748b; font-size: 0.875rem;">Status</span><div>${paper.status}</div></div>
                </div>
                <h4 style="margin-bottom: 16px; font-weight: 600;">Questions</h4>
                ${questionsHtml}
            </div>
            <div style="padding: 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn" onclick="viewPdf('${paper.id}')" style="background-color: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-file-pdf"></i> View PDF
                </button>
                <button class="btn" onclick="viewPdf('${paper.id}')" style="background-color: #64748b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-primary" onclick="this.closest('div').parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function viewPdf(approvalId) {
    try {
        const token = await auth.currentUser.getIdToken();
        // Open in new tab with auth token? 
        // Browser standard navigation doesn't send headers.
        // We need to handle auth. 
        // Option 1: Pass token in query param (less secure but works for short lived)
        // Option 2: Fetch blob and create URL.

        // Let's use fetch and blob to be secure and consistent with other parts
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        btn.disabled = true;

        const response = await fetch(`/generate_approval_pdf/${approvalId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Clean up URL after a delay? No, keep it open.
        } else {
            alert('Failed to generate PDF');
        }

        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch (e) {
        console.error(e);
        alert('Error opening PDF');
    }
}

function renderQuestionContent(q) {
    // Handle both snake_case and camelCase for sub_questions
    const subQuestions = q.sub_questions || q.subQuestions;

    if (subQuestions && subQuestions.length > 0) {
        return subQuestions.map(sq => {
            // Handle various key names for question text
            const text = sq.text || sq.question_text || sq.question || 'No text';
            return `
            <div style="margin-left: 16px; margin-top: 8px; font-size: 0.9rem;">
                <div>${text}</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
                    Marks: ${sq.marks} | CO: ${sq.co} | Level: ${sq.blooms_level}
                </div>
            </div>
        `}).join('');
    }

    // Fallback for main question text if no sub-questions
    const text = q.text || q.question_text || q.question || 'No text';
    return `<div>${text}</div>`;
}

function initChart() {
    const ctx = document.getElementById('papersChart');
    if (!ctx) return;

    if (papersChart) papersChart.destroy();

    const pending = hodApprovals.filter(a => a.status === 'pending').length;
    const approved = hodApprovals.filter(a => a.status === 'approved').length;
    const revision = hodApprovals.filter(a => a.status === 'rejected').length;

    papersChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Approved', 'Revision'],
            datasets: [{
                data: [pending, approved, revision],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20 }
                }
            },
            cutout: '70%'
        }
    });
}

// Faculty Management Logic

document.addEventListener('DOMContentLoaded', function () {
    // Modal Elements
    const modal = document.getElementById('register-faculty-modal');
    const btn = document.getElementById('register-faculty-btn');
    const span = document.getElementsByClassName('close-modal')[0];
    const form = document.getElementById('register-faculty-form');

    if (btn) {
        btn.onclick = function () {
            modal.style.display = "block";
        }
    }

    if (span) {
        span.onclick = function () {
            modal.style.display = "none";
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    if (form) {
        form.onsubmit = async function (e) {
            e.preventDefault();

            const name = document.getElementById('faculty-name').value;
            const email = document.getElementById('faculty-email').value;
            const password = document.getElementById('faculty-password').value;
            const submitBtn = form.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Registering...';

                const token = await auth.currentUser.getIdToken();
                const response = await fetch('/register_faculty', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Faculty registered successfully!');
                    modal.style.display = "none";
                    form.reset();
                    loadDepartmentFaculty(); // Refresh list
                } else {
                    alert(data.error || 'Registration failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during registration');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register';
            }
        }
    }
});

async function loadDepartmentFaculty() {
    try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('/get_department_faculty', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            renderFacultyTable(data.faculty);
        }
    } catch (error) {
        console.error('Error loading faculty:', error);
    }
}

function renderFacultyTable(facultyList) {
    const tbody = document.getElementById('faculty-table');
    if (!tbody) return;

    if (facultyList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 32px;">No faculty members found</td></tr>';
        return;
    }

    tbody.innerHTML = facultyList.map(faculty => `
        <tr>
            <td>
                <div style="font-weight: 500;">${faculty.name}</div>
            </td>
            <td>${faculty.email}</td>
            <td>${faculty.department || '-'}</td>
            <td>${faculty.papers_count || 0}</td>
            <td><span class="status-pill approved">Active</span></td>
        </tr>
    `).join('');
}

// Call loadDepartmentFaculty when switching to faculty tab
document.querySelector('a[data-section="faculty"]').addEventListener('click', loadDepartmentFaculty);
