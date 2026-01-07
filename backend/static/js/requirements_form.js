document.addEventListener('DOMContentLoaded', function () {
    const applyBtn = document.getElementById('apply-requirements-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const loadTemplateBtn = document.getElementById('load-template-btn');
    const loadTemplateModal = document.getElementById('load-template-modal');
    const closeTemplateModalBtn = document.getElementById('close-template-modal');
    const cancelLoadTemplateBtn = document.getElementById('cancel-load-template');
    const templatesList = document.getElementById('templates-list');

    // Helper to get form data
    function getFormData() {
        return {
            subject: document.getElementById('req-subject').value,
            code: document.getElementById('req-subject-code').value,
            dept: document.getElementById('req-department').value,
            sem: document.getElementById('req-semester').value,
            academic_year: document.getElementById('req-academic-year').value,
            exam_type: document.getElementById('req-exam-type').value,
            duration: document.getElementById('req-duration').value,
            max_marks: document.getElementById('req-total-marks').value,
            date: document.getElementById('req-exam-date').value,
            date: document.getElementById('req-exam-date').value,
            time: document.getElementById('req-exam-time').value,
            elective: document.getElementById('req-elective').value,

            // Question Distribution
            pattern: document.getElementById('req-question-pattern').value,
            num_modules: document.getElementById('req-num-modules').value,
            module_coverage: document.getElementById('req-module-coverage').value,
            distribution_rule: document.getElementById('req-distribution-rule').value,

            // Bloom's Taxonomy
            blooms_distribution: {
                l1: document.getElementById('req-l1-percent').value,
                l2: document.getElementById('req-l2-percent').value,
                l3: document.getElementById('req-l3-percent').value,
                l4: document.getElementById('req-l4-percent').value,
                l5: document.getElementById('req-l5-percent').value,
                l6: document.getElementById('req-l6-percent').value
            },

            // CO Weights
            co_weights: {
                co1: document.getElementById('req-co1-weight').value,
                co2: document.getElementById('req-co2-weight').value,
                co3: document.getElementById('req-co3-weight').value,
                co4: document.getElementById('req-co4-weight').value,
                co5: document.getElementById('req-co5-weight').value
            },

            // Additional Requirements
            selection_strategy: document.getElementById('req-selection-strategy').value,
            difficulty_level: document.getElementById('req-difficulty-level').value,
            special_instructions: document.getElementById('req-special-instructions').value
        };
    }

    // Auto-fill department from user profile
    async function setDepartmentFromProfile() {
        try {
            const user = window.firebaseAuth.currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const response = await fetch('/get_user_profile', {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                const userData = await response.json();
                if (userData && userData.department) {
                    const deptSelect = document.getElementById('req-department');
                    if (deptSelect) {
                        deptSelect.value = userData.department;
                        deptSelect.disabled = true; // Lock the selection
                        // Add a visual indicator or title
                        deptSelect.title = "Department locked to your profile setting";

                        // If the value wasn't in the list (e.g. custom string), add it
                        if (deptSelect.value !== userData.department) {
                            const option = document.createElement('option');
                            option.value = userData.department;
                            option.text = userData.department; // Display as is
                            deptSelect.add(option);
                            deptSelect.value = userData.department;
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error setting department:", e);
        }
    }

    // Call it initially
    setTimeout(setDepartmentFromProfile, 1000); // Wait for auth to settle


    // Helper to populate form data
    function populateForm(data) {
        if (!data) return;

        if (data.subject) document.getElementById('req-subject').value = data.subject;
        if (data.code) document.getElementById('req-subject-code').value = data.code;
        if (data.elective) document.getElementById('req-elective').value = data.elective;
        if (data.dept) document.getElementById('req-department').value = data.dept;
        if (data.sem) document.getElementById('req-semester').value = data.sem;
        if (data.academic_year) document.getElementById('req-academic-year').value = data.academic_year;
        if (data.exam_type) document.getElementById('req-exam-type').value = data.exam_type;
        if (data.duration) document.getElementById('req-duration').value = data.duration;
        if (data.max_marks) document.getElementById('req-total-marks').value = data.max_marks;
        if (data.date) document.getElementById('req-exam-date').value = data.date;
        if (data.time) document.getElementById('req-exam-time').value = data.time;

        if (data.pattern) document.getElementById('req-question-pattern').value = data.pattern;
        if (data.num_modules) document.getElementById('req-num-modules').value = data.num_modules;
        if (data.module_coverage) document.getElementById('req-module-coverage').value = data.module_coverage;
        if (data.distribution_rule) document.getElementById('req-distribution-rule').value = data.distribution_rule;

        if (data.blooms_distribution) {
            document.getElementById('req-l1-percent').value = data.blooms_distribution.l1 || '';
            document.getElementById('req-l2-percent').value = data.blooms_distribution.l2 || '';
            document.getElementById('req-l3-percent').value = data.blooms_distribution.l3 || '';
            document.getElementById('req-l4-percent').value = data.blooms_distribution.l4 || '';
            document.getElementById('req-l5-percent').value = data.blooms_distribution.l5 || '';
            document.getElementById('req-l6-percent').value = data.blooms_distribution.l6 || '';
        }

        if (data.co_weights) {
            document.getElementById('req-co1-weight').value = data.co_weights.co1 || '';
            document.getElementById('req-co2-weight').value = data.co_weights.co2 || '';
            document.getElementById('req-co3-weight').value = data.co_weights.co3 || '';
            document.getElementById('req-co4-weight').value = data.co_weights.co4 || '';
            document.getElementById('req-co5-weight').value = data.co_weights.co5 || '';
        }

        if (data.selection_strategy) document.getElementById('req-selection-strategy').value = data.selection_strategy;
        if (data.difficulty_level) document.getElementById('req-difficulty-level').value = data.difficulty_level;
        if (data.special_instructions) document.getElementById('req-special-instructions').value = data.special_instructions;

        // Trigger any change events if necessary (e.g. for validation highlighting)
        // updateValidationUI(); // If such function exists
    }

    // Save Template Handler
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const templateName = prompt("Enter a name for this template:");
            if (!templateName) return;

            try {
                const requirements = getFormData();
                const user = window.firebaseAuth.currentUser;
                if (!user) throw new Error('User not authenticated');
                const idToken = await user.getIdToken();

                const response = await fetch('/save_requirements_template', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        template_name: templateName,
                        requirements: requirements
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save template');
                }

                alert('Template saved successfully!');

            } catch (error) {
                console.error('Error saving template:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Load Template Handler
    if (loadTemplateBtn) {
        loadTemplateBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            loadTemplateModal.classList.remove('hidden');
            loadTemplateModal.classList.add('flex');
            fetchTemplates();
        });
    }

    // Close Modal Handlers
    function closeModal() {
        loadTemplateModal.classList.add('hidden');
        loadTemplateModal.classList.remove('flex');
    }

    if (closeTemplateModalBtn) closeTemplateModalBtn.addEventListener('click', closeModal);
    if (cancelLoadTemplateBtn) cancelLoadTemplateBtn.addEventListener('click', closeModal);

    // Fetch Templates
    async function fetchTemplates() {
        templatesList.innerHTML = '<p class="text-gray-500 text-center py-4">Loading templates...</p>';

        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const idToken = await user.getIdToken();

            const response = await fetch('/get_requirements_templates', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch templates');

            const data = await response.json();
            renderTemplates(data.templates);

        } catch (error) {
            console.error('Error fetching templates:', error);
            templatesList.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${error.message}</p>`;
        }
    }

    // Render Templates List
    function renderTemplates(templates) {
        if (!templates || templates.length === 0) {
            templatesList.innerHTML = '<p class="text-gray-500 text-center py-4">No saved templates found.</p>';
            return;
        }

        templatesList.innerHTML = '';
        templates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200';

            const date = new Date(template.created_at).toLocaleDateString();

            div.innerHTML = `
                <div>
                    <h4 class="font-medium text-gray-800">${template.name}</h4>
                    <p class="text-xs text-gray-500">Created: ${date}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="load-btn px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition" data-id="${template.id}">
                        Load
                    </button>
                    <button class="delete-btn px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition" data-id="${template.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Load Button
            div.querySelector('.load-btn').addEventListener('click', () => {
                populateForm(template.requirements);
                closeModal();
                alert(`Template "${template.name}" loaded!`);
            });

            // Delete Button
            div.querySelector('.delete-btn').addEventListener('click', async (e) => {
                if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                    await deleteTemplate(template.id);
                    fetchTemplates(); // Refresh list
                }
            });

            templatesList.appendChild(div);
        });
    }

    // Delete Template
    async function deleteTemplate(templateId) {
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const idToken = await user.getIdToken();

            const response = await fetch(`/delete_requirements_template/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete template');

        } catch (error) {
            console.error('Error deleting template:', error);
            alert(`Error: ${error.message}`);
        }
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            // Validate required fields
            const requiredIds = [
                'req-subject', 'req-subject-code', 'req-department',
                'req-semester', 'req-academic-year', 'req-exam-type',
                'req-duration', 'req-total-marks', 'req-question-pattern',
                'req-num-modules', 'req-module-coverage', 'req-distribution-rule'
            ];

            let isValid = true;
            requiredIds.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value) {
                    isValid = false;
                    el.classList.add('border-red-500');
                } else if (el) {
                    el.classList.remove('border-red-500');
                }
            });

            if (!isValid) {
                alert('Please fill in all required fields.');
                return;
            }

            // Show loading state
            const originalText = applyBtn.innerHTML;
            applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
            applyBtn.disabled = true;

            try {
                // Collect form data
                const metadata = getFormData();

                // Get user token
                const user = window.firebaseAuth.currentUser;
                if (!user) {
                    throw new Error('User not authenticated');
                }
                const idToken = await user.getIdToken();

                // Send request
                const response = await fetch('/generate_question_paper', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        subject: metadata.subject, // Top level for backward compatibility
                        pattern: metadata.pattern, // Top level for backward compatibility
                        metadata: metadata,
                        use_latest_upload_only: true // Default for now, can be made dynamic
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to generate question paper');
                }

                const result = await response.json();

                // Show success message
                alert('Question Paper Generated Successfully!');

                // You might want to refresh the recent list or show the preview
                if (typeof loadRecentQPs === 'function') {
                    loadRecentQPs();
                }

            } catch (error) {
                console.error('Error generating question paper:', error);
                alert(`Error: ${error.message}`);
            } finally {
                // Reset button state
                applyBtn.innerHTML = originalText;
                applyBtn.disabled = false;
            }
        });
    }
});
