// Tailwind Configuration
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#2563eb',
                secondary: '#1e40af',
                dark: '#0f172a',
                light: '#f8fafc'
            }
        }
    }
}

// PDF Specific Styles - Injected via JS to ensure html2canvas can read them
// (External CSS files often fail to load inside the canvas renderer due to CORS)
const pdfStyles = `
    .pdf-capture {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        max-width: 816px !important; 
        width: 816px !important;     
        min-width: 816px !important; 
    }

    /* PDF TEXT SIZE REDUCTION */
    .pdf-capture .text-3xl { font-size: 1.5rem !important; }
    .pdf-capture .text-2xl { font-size: 1.25rem !important; }
    .pdf-capture .text-lg { font-size: 1rem !important; }
    .pdf-capture .text-base { font-size: 0.85rem !important; }
    .pdf-capture .text-sm { font-size: 0.75rem !important; }
    .pdf-capture .text-xs { font-size: 0.65rem !important; }
    
    .pdf-capture p, 
    .pdf-capture li, 
    .pdf-capture div { 
        line-height: 1.3 !important; 
    }

    .pdf-capture aside { height: 1000px !important; }
    .pdf-capture .ghost-spacer { height: 1000px !important; }
    
    .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
    }
`;

// Fetch Data Function
async function fetchResumeData() {
    try {
        const response = await fetch('resume_data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        renderResume(data);
    } catch (error) {
        console.error('Error fetching resume data:', error);
        document.getElementById('resume-content').innerHTML = `
            <div class="p-8 text-center text-red-500">
                <h2 class="text-xl font-bold">Error Loading Data</h2>
                <p>Could not load 'resume_data.json'. Please ensure you are running this on a local server.</p>
            </div>
        `;
    }
}

// Render Function
function renderResume(data) {
    document.getElementById('profile-name').textContent = data.profile.name;
    document.getElementById('profile-title').textContent = data.profile.title;
    document.getElementById('profile-avatar').src = data.profile.avatarUrl;
    document.getElementById('profile-initials').textContent = data.profile.initials;

    document.getElementById('contact-list').innerHTML = data.contact.map(item => `
        <li class="flex items-center gap-3 group">
            <span class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                <i class="${item.icon}"></i>
            </span>
            ${item.link 
                ? `<a href="${item.link}" class="text-slate-300 hover:text-white transition-colors">${item.text}</a>` 
                : `<span class="text-slate-300">${item.text}</span>`
            }
        </li>
    `).join('');

    document.getElementById('education-list').innerHTML = data.education.map(edu => `
        <div class="avoid-break">
            <h4 class="font-bold text-white">${edu.degree}</h4>
            <p class="text-slate-400 text-sm">${edu.school}</p>
            <p class="text-slate-500 text-xs mt-1">${edu.year}</p>
        </div>
    `).join('');

    document.getElementById('skills-list').innerHTML = data.skills.map(skill => `
        <span class="px-3 py-1 bg-slate-800 text-xs rounded-full text-slate-300 border border-slate-700">${skill}</span>
    `).join('');

    document.getElementById('summary-text').textContent = data.summary;

    document.getElementById('experience-list').innerHTML = data.experience.map(job => `
        <div class="mb-4 relative pl-4 border-l-2 border-slate-200 avoid-break flow-root">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full ${job.colorClass} border-4 border-white"></div>
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-3 flex-wrap gap-x-2">
                <h3 class="text-lg font-bold text-slate-800">
                    ${job.role} <span class="text-slate-500 font-medium text-base"> • ${job.company}</span>
                </h3>
                <span class="text-sm font-semibold ${job.periodClass} px-2 py-1 rounded mt-1 sm:mt-0 flex-shrink-0">${job.period}</span>
            </div>
            ${job.description ? `<p class="text-slate-600 text-sm mb-2 leading-tight">${job.description}</p>` : ''}
            <ul class="list-disc list-outside ml-4 text-slate-600 space-y-1 text-sm leading-[1.4]">
                ${job.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    document.getElementById('projects-list').innerHTML = data.projects.map(project => `
        <div class="group block border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all avoid-break">
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${project.title}</h3>
            </div>
            <p class="text-sm text-slate-500 mb-3">${project.description}</p>
            <div class="flex gap-2">
                ${project.tags.map(tag => `<span class="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// PDF Download Function
function downloadPDF() {
    const element = document.getElementById('resume-content');
    const btn = document.getElementById('download-btn');
    const originalContent = btn.innerHTML;

    // 1. Inject PDF Styles dynamically
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = pdfStyles;
    styleSheet.id = "dynamic-pdf-styles";
    document.head.appendChild(styleSheet);

    // 2. Loading State
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');

    // 3. Add capture class
    element.classList.add('pdf-capture');

    const opt = {
        margin:       0, 
        filename:     'Josh Odell Resume.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0, 
            logging: false 
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Cleanup
        btn.innerHTML = originalContent;
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        element.classList.remove('pdf-capture');
        // Remove injected styles
        document.head.removeChild(styleSheet);
    }).catch(err => {
        console.error(err);
        alert('Error generating PDF.');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        element.classList.remove('pdf-capture');
        if (document.getElementById("dynamic-pdf-styles")) {
            document.head.removeChild(styleSheet);
        }
    });
}

document.addEventListener('DOMContentLoaded', fetchResumeData);