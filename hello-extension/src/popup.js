/*Setting Variables By Id*/

let every_tabs = []; /*to have every tab info by ID in here for function use*/
let Filtered_Tabs = []; /*To stoe the filtered tabs in here for function use*/
let Selected_Ids = new Set(); /*Wont hold duplicate data in it*/


/*Fetching the ID of all HTML elements so that JS can use it here*/
const Tab_List = document.getElementById('Tab_List');
const Tab_Amount = document.getElementById('Tab_Amount');
const Search_Input = document.getElementById('Search_Input');
const Clear_Search = document.getElementById('Clear_Search');
const Select_All = document.getElementById('Select_All');
const Group_Button = document.getElementById('Group_Button');
const Close_Button = document.getElementById('Close_Button');
const Group_Name_Input = document.getElementById('Group_Name_Input');
const Group_Tab_Name_Bar = document.getElementById('Group_Tab_Name_Bar');
const Confirm_Group_Button = document.getElementById('Confirm_Group_Button');


function Loading_Tabs(){ /*This is for all tabs that is open currently in all windows in chrome*/
    chrome.tabs.query({}, (tabs) => {
        every_tabs = tabs;
        Filtered_Tabs = tabs;
        Selected_Ids.clear();
        Tab_Rendering(Filtered_Tabs);
        updateTabCount(Filtered_Tabs.length);
        updateToolbar();
    });
}

function Tab_Rendering(tabs){
    if(tabs.length === 0){ 
        Tab_List.innerHTML = '<div class="loading-state">No Tabs Found!</div>';/*If got no tabs then shows the message "No Tabs Found!" */
        return; /*If the statements is True then stops the function at here*/
    }

    Tab_List.innerHTML = tabs.map(tab => { /*For every tabs makes a HTML string*/
        const isSelected = Selected_Ids.has(tab.id); /*Checks if Selected_Ids already have the tab ID in it, True or False*/
        const faviconHtml = tab.favIconUrl /*Chrome Looks for the icon of the website*/
            ? `<img class="tab-favicon" src="${tab.favIconUrl}" alt="">` /*If got website icon then shows it normally*/
            : `<div class="tab-favicon">No Icon</div>`; /*If got no website icon then shows No Icon*/
            
            /*Creates an checker box and X box for the tabs and if the tab is selected then applied the tab-item class to it but if the X box is clicked then it removes the Tab*/
        return `
            <div class="tab-item ${isSelected ? 'selected' : ''}" data-id="${tab.id}">
                <input type="checkbox" class="tab-checkbox" data-id="${tab.id}" ${isSelected ? 'checked' : ''} />
                ${faviconHtml}
                <div class="tab-info">
                    <div class="tab-title">${escapeHtml(tab.title)}</div>
                    <div class="tab-url">${escapeHtml(tab.url)}</div>
                </div>
                <button class="tab-close-btn" data-id="${tab.id}">✕</button> 
            </div>
        `;
    }).join(''); /*Combines all the strings of the url without spacing*/

    attachTabEvents();
}

function attachTabEvents() { /*Adds eventlistener to all tabs*/
    document.querySelectorAll('.tab-checkbox').forEach(cb => { /*aloopp through every checkbox for every tabs*/
        cb.addEventListener('change', () => { /*Records the status of checkbox either checked or uncheked*/
            const id = parseInt(cb.dataset.id); /*Fetch IDs from checkerbox and put it into id*/
            if (cb.checked) Selected_Ids.add(id); /*Checking the checkbox causes the JS to select the tabs id and put it into the Selected_Ids to be used later*/
            else Selected_Ids.delete(id); /*An X to close the tab and to also remove it from the Selected_Ids*/
            cb.closest('.tab-item').classList.toggle('selected', cb.checked); 
            updateToolbar(); /*Custom function but it help to keep the page GUI refreshed often with needed data like Group of tabs or the Close Tabs data*/
            syncSelectAll(); /*Make sure the Select All checkbox dont unselect when user select an tab*/
        });
    });

    document.querySelectorAll('.tab-item').forEach(row => { /*Finds all the tabs and loops through them all*/
        row.addEventListener('click', (e) => { /*Waits for clicks on the tab listed down*/
            if (e.target.classList.contains('tab-checkbox')) return;
            if (e.target.classList.contains('tab-close-btn')) return;
            const cb = row.querySelector('.tab-checkbox');/*Assign cd with the tabs checkbox*/
            cb.checked = !cb.checked; /*Flips the state of the checkbox*/
            cb.dispatchEvent(new Event('change')); /**/
        });
    });

    document.querySelectorAll('.tab-close-btn').forEach(btn => { /*Loops based on available X buttons from all tabs*/
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            chrome.tabs.remove(id, () => {
                Selected_Ids.delete(id);
                Loading_Tabs();
            });
        });
    });
}

Search_Input.addEventListener('input', () => {
    const query = Search_Input.value.toLowerCase().trim();
    Clear_Search.classList.toggle('visible', query.length > 0);
    Filtered_Tabs = every_tabs.filter(tab =>
        tab.title.toLowerCase().includes(query) ||
        tab.url.toLowerCase().includes(query)
    );
    Selected_Ids = new Set([...Selected_Ids].filter(id => Filtered_Tabs.some(t => t.id === id)));
    Tab_Rendering(Filtered_Tabs);
    updateTabCount(Filtered_Tabs.length);
    updateToolbar();
    syncSelectAll();
});

Clear_Search.addEventListener('click', () => {
    Search_Input.value = '';
    Clear_Search.classList.remove('visible');
    Filtered_Tabs = every_tabs;
    Selected_Ids.clear();
    Tab_Rendering(Filtered_Tabs);
    updateTabCount(Filtered_Tabs.length);
    updateToolbar();
    syncSelectAll();
});

Select_All.addEventListener('change', () => {
    if (Select_All.checked) Filtered_Tabs.forEach(tab => Selected_Ids.add(tab.id));
    else Filtered_Tabs.forEach(tab => Selected_Ids.delete(tab.id));
    Tab_Rendering(Filtered_Tabs);
    updateToolbar();
});

function syncSelectAll() {
    const visibleIds = Filtered_Tabs.map(t => t.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every(id => Selected_Ids.has(id));
    Select_All.checked = allChecked;
    Select_All.indeterminate = !allChecked && Selected_Ids.size > 0;
}

Group_Button.addEventListener('click', () => {
    if (Selected_Ids.size === 0) return;
    Group_Tab_Name_Bar.classList.toggle('hidden');
    if (!Group_Tab_Name_Bar.classList.contains('hidden')) Group_Name_Input.focus();
});

Confirm_Group_Button.addEventListener('click', createGroup);
Group_Name_Input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createGroup();
    if (e.key === 'Escape') Group_Tab_Name_Bar.classList.add('hidden');
});

function createGroup() {
    const name = Group_Name_Input.value.trim() || 'My Group';
    chrome.tabs.group({ tabIds: [...Selected_Ids] }, (groupId) => {
        chrome.tabGroups.update(groupId, { title: name, color: 'blue' }, () => {
            Group_Tab_Name_Bar.classList.add('hidden');
            Group_Name_Input.value = '';
            Selected_Ids.clear();
            Loading_Tabs();
        });
    });
}

Close_Button.addEventListener('click', () => {
    if (Selected_Ids.size === 0) return;
    chrome.tabs.remove([...Selected_Ids], () => {
        Selected_Ids.clear();
        Loading_Tabs();
    });
});

function updateToolbar() {
    Group_Button.disabled = Selected_Ids.size === 0;
    Close_Button.disabled = Selected_Ids.size === 0;
}

function updateTabCount(count) {
    Tab_Amount.textContent = `${count} TAB${count === 1 ? '' : 's'}`; /*To show the ammount of tabs currently opened*/
}

function escapeHtml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

Loading_Tabs();