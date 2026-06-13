var profilesKey = "er_profiles";

(function ($) {
  var defaultProfiles = {
    current: "Default",
  };

  defaultProfiles[profilesKey] = {
    "Default": {
      checklistData: {},
      collapsed: {},
      isDefault: true,
      lastActiveTab: '#tabPlaythrough',
      activeFilter: 'all',
    },
  };

  var profiles = $.jStorage.get(profilesKey, defaultProfiles);

  if (!profiles[profilesKey]["Default"]) {
    profiles[profilesKey]["Default"] = {
      checklistData: {},
      collapsed: {},
      isDefault: true
    };
    $.jStorage.set(profilesKey, profiles);
  }

  function initializeUI() {
    if ($("ul li[data-id]").length === 0) {
      return;
    }

    const lastTab = profiles[profilesKey][profiles.current].lastActiveTab || '#tabPlaythrough';
    const activeFilter = profiles[profilesKey][profiles.current].activeFilter || 'all';

    if (!profiles[profilesKey][profiles.current].collapsed) {
      profiles[profilesKey][profiles.current].collapsed = {};
    }

    $('.collapse').each(function () {
      const collapseId = $(this).attr('id');
      if (collapseId === 'navbarNavDropdown') return;
      const isCollapsed = profiles[profilesKey][profiles.current].collapsed[collapseId];

      if (isCollapsed) {
        $(this).removeClass('show');
        $(this).prev().find('.btn-collapse').addClass('collapsed').attr('aria-expanded', 'false');
      } else {
        $(this).addClass('show');
        $(this).prev().find('.btn-collapse').removeClass('collapsed').attr('aria-expanded', 'true');
      }
    });

    $('.btn-primary').removeClass('active');
    $(`.btn-primary[data-filter="${activeFilter}"]`).addClass('active');
    applyFilter(activeFilter);

    $('.nav-link').removeClass('active');
    $('.tab-pane').removeClass('show active');
    $(`a[href="${lastTab}"]`).addClass('active');
    $(lastTab).addClass('show active');

    if ($(`a[href="${lastTab}"]`).data('show-buttons')) {
      $('#collapseButtons').show();
    } else {
      $('#collapseButtons').hide();
    }

    $("ul li[data-id]").each(function () {
      addCheckbox(this);
    });
    populateProfiles();
    calculateTotals();
  }

  $(document).ready(function () {
    initializeUI();
    calculateTotals();

    $('.theme-btn').click(function () {
      const isDark = document.documentElement.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark-mode' : '');
    });
    
    $('#colorBlindnessToggle').on('change', function() {
    setColorBlindnessMode(this.value);
    });

    const savedColorBlindness = localStorage.getItem('colorBlindness');
    if (savedColorBlindness) {
      $('#colorBlindnessToggle').val(savedColorBlindness);
    }

    $("a[href^='http']").attr("target", "_blank");

    $(".nav-link").on("click", function (e) {
      e.preventDefault();

      $(".nav-link").removeClass("active");
      $(".tab-pane").removeClass("show active");
      $(this).addClass("active");
      const targetTab = $(this).attr("href");

      profiles[profilesKey][profiles.current].lastActiveTab = targetTab;
      $.jStorage.set(profilesKey, profiles);

      $(targetTab).addClass("show active");
      $('.searchBar').val('');
      $('.tab-pane').unhighlight();
      $('#tabAchievements li[data-id]').show();

      const activeFilter = profiles[profilesKey][profiles.current].activeFilter;
      applyFilterAndSearch(activeFilter, '');

      if ($(this).data('show-buttons')) {
        $('#collapseButtons').show();
      } else {
        $('#collapseButtons').hide();
      }
    });

    $(document).on('click', 'input[type="checkbox"]', function () {
      var id = $(this).attr('id');
      var isChecked = $(this).prop('checked');

      profiles[profilesKey][profiles.current].checklistData[id] = isChecked;

      var $label = $(this).closest('.checkbox').find('label');
      if (isChecked) {
        $label.addClass('completed');
      } else {
        $label.removeClass('completed');
      }
      $.jStorage.set(profilesKey, profiles);
      calculateTotals();
    });

    $('#profiles').on('change', function () {
      switchProfile($(this).val());
    });

    $('#addProfile').on('click', function () {
      var profile_name = prompt("Enter new profile name:");
      if (profile_name) {
        if (profiles[profilesKey][profile_name]) {
          alert("Profile " + profile_name + " already exists!");
          return;
        }
        clearUI();

        profiles[profilesKey][profile_name] = {
          checklistData: {},
          collapsed: {},
          isDefault: false,
          lastActiveTab: '#tabPlaythrough',
          activeFilter: 'all'
        };

        profiles.current = profile_name;
        $.jStorage.set(profilesKey, profiles);

        $('.btn-primary[data-filter]').removeClass('active');
        $('.btn-primary[data-filter="all"]').addClass('active');

        $('[id^="_totals_"], [id^="_nav_totals_"]').each(function () {
          $(this).removeClass('done in_progress');
          $(this).html('0/0');
        });

        $('.collapse').each(function () {
          $(this).collapse('show');
          $(this).prev().find('.btn-collapse').removeClass('collapsed');
        });
        populateProfiles();
        restoreState(profile_name);
        applyFilter('all');
        calculateTotals();
      }
    });

    $('#editProfile').on('click', function () {
      var oldName = profiles.current;

      if (profiles[profilesKey][oldName].isDefault) {
        alert("Can't edit the default profile");
        return;
      }

      var newName = prompt("Enter new name for profile:", oldName);
      if (newName && newName !== oldName) {
        profiles[profilesKey][newName] = {
          ...profiles[profilesKey][oldName],
          isDefault: false
        };

        delete profiles[profilesKey][oldName];
        profiles.current = newName;
        $.jStorage.set(profilesKey, profiles);
        populateProfiles();
      }
    });

    $('#deleteProfile').on('click', function () {
      var currentProfile = profiles.current;

      if (profiles[profilesKey][currentProfile].isDefault) {
        if (confirm("Reset all progress for the default profile?")) {
          const activeFilter = profiles[profilesKey][currentProfile].activeFilter;

          profiles[profilesKey][currentProfile] = {
            checklistData: {},
            collapsed: {},
            isDefault: true,
            lastActiveTab: '#tabPlaythrough',
            activeFilter: activeFilter
          };
          $.jStorage.set(profilesKey, profiles);

          $('.collapse').each(function () {
            $(this).collapse('show');
          });

          $('[id^="_totals_"]').each(function () {
            $(this).removeClass('done in_progress');
            $(this).html('0/0');
          });

          $('[id^="_nav_totals_"]').each(function () {
            $(this).removeClass('done in_progress');
            $(this).html('0/0');
          });
          restoreState(currentProfile);
          populateChecklists();
          applyFilter(activeFilter);
          calculateTotals();
        }
      } else {
        if (confirm(`Are you sure you want to delete "${currentProfile}"?`)) {
          if (deleteProfile(currentProfile)) {
            switchProfile(profiles.current);
            restoreState(profiles.current);
            populateProfiles();
            calculateTotals();
          }
        }
      }
    });

    $('.collapse').each(function () {
      var collapseId = $(this).attr('id');

      if (typeof profiles[profilesKey][profiles.current].collapsed === 'undefined') {
        profiles[profilesKey][profiles.current].collapsed = {};
      }

      if (typeof profiles[profilesKey][profiles.current].collapsed[collapseId] === 'undefined') {
        profiles[profilesKey][profiles.current].collapsed[collapseId] = !$(this).hasClass('show');
      }
    });

    $('.collapse').on('shown.bs.collapse hidden.bs.collapse', function () {
      const collapseId = $(this).attr('id');
      const isCollapsed = !$(this).hasClass('show');

      $(this).prev().find('.btn-collapse').attr('aria-expanded', !isCollapsed);
      $(this).attr('aria-hidden', isCollapsed);

      profiles[profilesKey][profiles.current].collapsed[collapseId] = isCollapsed;
      $.jStorage.set(profilesKey, profiles);
    });

    $('.btn-collapse-all').on('click', function () {
      const $section = $(this).closest('.tab-pane');
      const $collapseElements = $section.find('.collapse');

      $collapseElements.removeClass('show').attr('aria-hidden', 'true');
      $collapseElements.prev().find('.btn-collapse').addClass('collapsed').attr('aria-expanded', 'false');

      const collapseStates = {};
      $collapseElements.each(function () {
        collapseStates[$(this).attr('id')] = true;
      });

      Object.assign(profiles[profilesKey][profiles.current].collapsed, collapseStates);
      $.jStorage.set(profilesKey, profiles);
    });


    $('.btn-expand-all').on('click', function () {
      const $section = $(this).closest('.tab-pane');
      const $collapseElements = $section.find('.collapse');

      $collapseElements.addClass('show').attr('aria-hidden', 'false');
      $collapseElements.prev().find('.btn-collapse').removeClass('collapsed').attr('aria-expanded', 'true');

      const collapseStates = {};
      $collapseElements.each(function () {
        collapseStates[$(this).attr('id')] = false;
      });

      Object.assign(profiles[profilesKey][profiles.current].collapsed, collapseStates);
      $.jStorage.set(profilesKey, profiles);
    });

    $(window).scroll(function () {
      if ($(this).scrollTop() > 300) {
        $('#backToTop').addClass('show');
      } else {
        $('#backToTop').removeClass('show');
      }
    });

    $('#backToTop').click(function () {
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
      return false;
    });

    $('.btn-primary[data-filter]').click(function () {
      const filter = $(this).data('filter');
      const searchText = $('#searchBar-playthrough').val().toLowerCase();

      $('.btn-primary[data-filter]').removeClass('active');
      $(this).addClass('active');

      profiles[profilesKey][profiles.current].activeFilter = filter;
      $.jStorage.set(profilesKey, profiles);

      applyFilterAndSearch(filter, searchText);
      calculateTotals();
    });
    calculateTotals();
  });

  function addCheckbox(el) {
    var $el = $(el);
    var content = $el.html().split('\n')[0];
    var sublists = $el.children('ul');
    var checkboxId = $el.attr('data-id');

    var template =
      '<div class="checkbox">' +
      '<input type="checkbox" id="' + checkboxId + '">' +
      '<label for="' + checkboxId + '">' +
      '<span class="item_content">' + content + '</span>' +
      '</label>' +
      '</div>';

    $el.html(template).append(sublists);

    var storedState = profiles[profilesKey][profiles.current].checklistData[checkboxId];
    if (storedState) {
      $('#' + checkboxId).prop('checked', true);
      $('label', $el).addClass('completed');
    }
  }

  function populateProfiles() {
    var profileSelect = $('#profiles');
    profileSelect.empty();

    $.each(profiles[profilesKey], function (name) {
      profileSelect.append($('<option>', {
        value: name,
        text: name,
        selected: name === profiles.current
      }));
    });
  }

  function populateChecklists() {
    $('input[type="checkbox"]').prop("checked", false);

    $.each(
      profiles[profilesKey][profiles.current].checklistData,
      function (index, value) {
        $("#" + index).prop("checked", value);
      }
    );
    calculateTotals();
  }

  function calculateTotals() {
    $('[id$="_overall_total"]').each(function () {
      var type = this.id.match(/(.*)_overall_total/)[1];
      var overallCount = 0,
        overallChecked = 0;

      $('[id^="' + type + '_totals_"]').each(function () {
        var regex = new RegExp(type + "_totals_(.*)");
        var i = parseInt(this.id.match(regex)[1]);
        var count = 0,
          checked = 0;
        var activeFilter = profiles[profilesKey][profiles.current].activeFilter;

        var isPlaythrough = type === 'playthrough';

        for (var j = 1; ; j++) {
          var checkbox = $("#" + type + "_" + i + "_" + j);
          if (checkbox.length == 0) break;

          var checkboxLi = checkbox.closest('li');
          if (isPlaythrough && activeFilter !== 'all') {
            if (!checkboxLi.find('a').hasClass(activeFilter)) {
              continue;
            }
          }

          count++;
          overallCount++;
          if (checkbox.prop("checked")) {
            checked++;
            overallChecked++;
          }
        }

        if (count > 0) {
          var span = $("#" + type + "_totals_" + i);
          span.html(checked + "/" + count);

          if (checked === count) {
            span.removeClass('in_progress').addClass('done');
          } else if (checked > 0) {
            span.removeClass('done').addClass('in_progress');
          } else {
            span.removeClass('done in_progress');
          }
        }

        if (checked === count) {
          this.innerHTML = $("#" + type + "_nav_totals_" + i)[0].innerHTML =
            "DONE";
          $(this).removeClass("in_progress").addClass("done");
          $($("#" + type + "_nav_totals_" + i)[0])
            .removeClass("in_progress")
            .addClass("done");
        } else {
          this.innerHTML = $("#" + type + "_nav_totals_" + i)[0].innerHTML =
            checked + "/" + count;
          $(this).removeClass("done").addClass("in_progress");
          $($("#" + type + "_nav_totals_" + i)[0])
            .removeClass("done")
            .addClass("in_progress");
        }
      });

      if (overallChecked === overallCount) {
        this.innerHTML = "DONE";
        $(this).removeClass("in_progress").addClass("done");
      } else {
        this.innerHTML = overallChecked + "/" + overallCount;
        $(this).removeClass("done").addClass("in_progress");
      }
    });
    updateNavLinkStates();
  }

  function clearUI() {
    $('.checkbox input[type="checkbox"]').prop('checked', false);
    $('.checkbox label').removeClass('completed');
    $('.collapse').addClass('show');
    $('.btn-collapse').removeClass('collapsed');

    $('[id^="_totals_"], [id^="_nav_totals_"]')
      .removeClass('done in_progress')
      .html('0/0');
  }

  function applyFilter(filter) {
    if (filter === 'all') {
      $('.playthrough-wrapper li').show();
    } else {
      $('.playthrough-wrapper li').hide();
      $(`.playthrough-wrapper li a.${filter}`).each(function () {
        const $link = $(this);
        const $li = $link.closest('li');
        const $parentLi = $li.parents('li');

        $li.show();

        if ($parentLi.length) {
          $parentLi.show();
        }
      });
    }
    $('.playthrough-wrapper h3').show();

    profiles[profilesKey][profiles.current].activeFilter = filter;
    $.jStorage.set(profilesKey, profiles);
    calculateTotals();
  }

  function switchProfile(profile_name) {
    clearUI();
    profiles.current = profile_name;

    if (!profiles[profilesKey][profile_name]) {
      profiles[profilesKey][profile_name] = {
        checklistData: {},
        collapsed: {},
        isDefault: false,
        lastActiveTab: '#tabPlaythrough',
        activeFilter: 'all'
      };
    }
    $.jStorage.set(profilesKey, profiles);

    $('.collapse').each(function () {
      const collapseId = $(this).attr('id');
      const isCollapsed = profiles[profilesKey][profile_name].collapsed[collapseId];

      if (isCollapsed) {
        $(this).removeClass('show');
        $(this).prev().find('.btn-collapse').addClass('collapsed').attr('aria-expanded', 'false');
      } else {
        $(this).addClass('show');
        $(this).prev().find('.btn-collapse').removeClass('collapsed').attr('aria-expanded', 'true');
      }
    });

    const lastTab = profiles[profilesKey][profile_name].lastActiveTab || '#tabPlaythrough';
    const activeFilter = profiles[profilesKey][profile_name].activeFilter || 'all';

    $('.nav-link').removeClass('active');
    $('.tab-pane').removeClass('show active');
    $(`a[href="${lastTab}"]`).addClass('active');
    $(lastTab).addClass('show active');

    $('.btn-primary').removeClass('active');
    $(`.btn-primary[data-filter="${activeFilter}"]`).addClass('active');

    restoreState(profile_name);
    applyFilter(activeFilter);
    calculateTotals();
  }

  function deleteProfile(profileName) {
    if (profiles[profilesKey][profileName].isDefault) {
      const defaultProfile = {
        checklistData: {},
        collapsed: {},
        isDefault: true,
        lastActiveTab: '#tabPlaythrough',
        activeFilter: profiles[profilesKey][profileName].activeFilter || 'all'
      };

      profiles[profilesKey][profileName] = defaultProfile;
      $.jStorage.set(profilesKey, profiles);

      clearUI();
      restoreState(profileName);
      calculateTotals();
      return true;
    }

    if (!profiles[profilesKey][profileName] ||
      Object.keys(profiles[profilesKey]).length <= 1) {
      return false;
    }

    let defaultProfileKey = Object.keys(profiles[profilesKey])
      .find(key => profiles[profilesKey][key].isDefault);

    delete profiles[profilesKey][profileName];
    profiles.current = defaultProfileKey;
    $.jStorage.set(profilesKey, profiles);
    clearUI();
    restoreState(defaultProfileKey);
    return true;
  }

  function restoreState(profile_name) {
    const activeFilter = profiles[profilesKey][profile_name].activeFilter || 'all';
    $('.btn-primary[data-filter]').removeClass('active');
    $(`.btn-primary[data-filter="${activeFilter}"]`).addClass('active');
    applyFilter(activeFilter);

    $.each(profiles[profilesKey][profile_name].checklistData, function (id, isChecked) {
      const checkbox = $("#" + id);
      if (checkbox.length > 0) {
        checkbox.prop("checked", isChecked);

        const label = checkbox.closest('.checkbox').find('label');
        if (isChecked) {
          label.addClass('completed');
        } else {
          label.removeClass('completed');
        }
      }
    });

    if (profiles[profilesKey][profile_name].collapsed) {
      $.each(profiles[profilesKey][profile_name].collapsed, function (id, isCollapsed) {
        const collapseElement = $('#' + id);
        if (collapseElement.length > 0) {
          if (isCollapsed) {
            collapseElement.removeClass('show');
          } else {
            collapseElement.addClass('show');
          }
          updateCollapseIcon(id, isCollapsed);
        }
      });
    }
  }

  function updateCollapseIcon(collapseId, isCollapsed) {
    var button = $('a[href="#' + collapseId + '"]');
    if (isCollapsed) {
      button.addClass('collapsed');
    } else {
      button.removeClass('collapsed');
    }
  }

  $(function () {
    $('#searchBar-playthrough').on('input', function () {
      const searchText = $(this).val().toLowerCase();
      const activeFilter = profiles[profilesKey][profiles.current].activeFilter;

      applyFilterAndSearch(activeFilter, searchText);
    });

    $('#searchBar-achievements').on('input', function () {
      const searchText = $(this).val().toLowerCase();
      $('#tabAchievements').unhighlight();

      $('#tabAchievements li[data-id]').each(function () {
        const $item = $(this);
        const itemText = $item.text().toLowerCase();

        if (searchText === '' || itemText.includes(searchText)) {
          $item.show();
          $item.parents('li').show();
        } else {
          $item.hide();
        }
      });
      $('#tabAchievements h3').show();

      if (searchText) {
        $('#tabAchievements .checkbox .item_content').highlight(searchText);
      }
    });

    $('.nav-link').on('click', function () {
      $('.searchBar').val('');
      $('.tab-pane').unhighlight();
    });
  });

  function applyFilterAndSearch(filter, searchText = '') {
    $('.playthrough-wrapper li').hide();

    if (!searchText) {
      $('#playthrough_list').unhighlight();
    }

    let $visibleItems;
    if (filter === 'all') {
      $visibleItems = $('.playthrough-wrapper li[data-id]');
    } else {
      $visibleItems = $(`.playthrough-wrapper li a.${filter}`).closest('li');
    }

    if (searchText) {
      $('#playthrough_list').unhighlight();

      $visibleItems.each(function () {
        const $item = $(this);
        const $content = $item.find('.checkbox .item_content');
        const itemText = $content.text().toLowerCase();
        const hasMatch = itemText.includes(searchText);

        if (hasMatch) {
          $item.show();
          $item.parents('li').show();
        } else {
          const $matchingChildren = $item.find('li').filter(function () {
            return $(this).find('.checkbox .item_content').text().toLowerCase().includes(searchText);
          });

          if ($matchingChildren.length > 0) {
            $matchingChildren.show();
            $item.show();
            $item.parents('li').show();
          }
        }
      });

      $('#playthrough_list .checkbox .item_content').highlight(searchText);
    } else {
      $visibleItems.show();
      $visibleItems.parents('li').show();
    }
    $('.playthrough-wrapper h3').show();
  }

  function createSearchHandler(tabId, contentSelector) {
    $(`#searchBar-${tabId}`).on('input', function () {
      const searchText = $(this).val().toLowerCase();
      $(`#tab${tabId}`).unhighlight();

      $(`#tab${tabId} li[data-id]`).each(function () {
        const $item = $(this);
        const itemText = $item.text().toLowerCase();

        if (searchText === '' || itemText.includes(searchText)) {
          $item.show();
          $item.parents('li').show();
        } else {
          $item.hide();
        }
      });
      $(`#tab${tabId} h3`).show();

      if (searchText) {
        $(`#tab${tabId} ${contentSelector}`).highlight(searchText);
      }
    });
  }
  createSearchHandler('Armaments', '.checkbox .item_content');
  createSearchHandler('Armor', '.checkbox .item_content');
  createSearchHandler('Misc', '.checkbox .item_content');

  document.addEventListener('keydown', function(e) {
    if (e.target.matches('input[type="search"], textarea')) return;

    if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const offcanvasElement = document.getElementById("offcanvasNavbar");
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement) || new bootstrap.Offcanvas(offcanvasElement);

      bsOffcanvas[offcanvasElement.classList.contains('show') ? 'hide' : 'show']();
      return;
    }

    switch (e.key.toLowerCase()) {
      case '1':
        document.querySelector('#playthrough-tab').click();
        break;
      case '2':
        document.querySelector('#achievements-tab').click();
        break;
      case '3':
        document.querySelector('#armaments-tab').click();
        break;
      case '4':
        document.querySelector('#armor-tab').click();
        break;
      case '5':
        document.querySelector('#ashes-tab').click();
        break;
      case '6':
        document.querySelector('#spells-tab').click();
        break;
      case '7':
        document.querySelector('#misc-tab').click();
        break;
      case '8':
        document.querySelector('#resources-tab').click();
        break;
      case '9':
        document.querySelector('#faq-tab').click();
        break;
      case 'q':
        document.querySelector('[data-filter="all"]').click();
        break;
      case 'b':
        document.querySelector('[data-filter="boss"]').click();
        break;
      case 'n':
        document.querySelector('[data-filter="npc"]').click();
        break;
      case 'k':
        document.querySelector('[data-filter="key-item"]').click();
        break;
      case 'a':
        document.querySelector('[data-filter="achievement"]').click();
        break;
      case 'm':
        document.querySelector('[data-filter="merchant"]').click();
        break;
      case 'e':
        document.querySelector('.tab-pane.active .btn-expand-all').click();
        break;
      case 'c':
        document.querySelector('.tab-pane.active .btn-collapse-all').click();
        break;
      case 't':
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });
        break;
      case 'd':
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'auto'
        });
        break;
    }
  });

  function updateNavLinkStates() {
    const tabIds = ['Playthrough', 'Achievements', 'Armaments', 'Armor', 'Ashes', 'Spells', 'Misc'];
    
    tabIds.forEach(tabId => {
      const navLink = document.querySelector(`#${tabId.toLowerCase()}-tab`);
      const section = document.querySelector(`#tab${tabId}`);
      const totalSpan = section.querySelector(`[id$="_overall_total"]`);
      
      if (totalSpan && totalSpan.textContent === 'DONE') {
        navLink.classList.add('section-done');
      } else {
        navLink.classList.remove('section-done');
      }
    });
  }

  function setColorBlindnessMode(mode) {
    document.documentElement.classList.remove(
      "protanopia",
      "deuteranopia", 
      "tritanopia",
      "achromatopsia"
    );
  
    if (mode) {
      document.documentElement.classList.add(mode);
      localStorage.setItem('colorBlindness', mode);
    } else {
      localStorage.removeItem('colorBlindness');
    }
  }

  const savedColorBlindness = localStorage.getItem('colorBlindness');
  if (savedColorBlindness) {
    setColorBlindnessMode(savedColorBlindness);
  }

const totalSize = Object.keys(localStorage).reduce((total, key) => {
  return total + (localStorage[key].length + key.length) * 2;
}, 0) / 1024 / 1024;

})(jQuery);
