const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;

const Gdk = imports.gi.Gdk;
const Wnck = imports.gi.Wnck;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = new Me.imports.utils.Utils();

const Lang = imports.lang;
const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

let createSlider = function(configName) {
  let ret = new Gtk.Scale({digits: 0, sensitive: true, orientation: Gtk.Orientation.HORIZONTAL, margin_right: 6, margin_left: 6});
  ret.set_range(0, 100);
  ret.set_value(Utils.getNumber(configName, 50));
  ret.set_value_pos(Gtk.PositionType.RIGHT);
  ret.connect("value-changed", function(obj, userData) {
    Utils.setParameter(configName, obj.get_value());
  });
  return ret;
}

const PutWindowSettingsWidget = new GObject.Class({
  Name: 'PutWindow.Prefs.PutWindowSettingsWidget',
  GTypeName: 'PutWindowSettingsWidget',
  Extends: Gtk.Grid,

  _init : function(params) {
    this.parent(params);
    this.orientation = Gtk.Orientation.VERTICAL;
    this.expand = true;
    this._wnckScreen = Wnck.Screen.get_default();

    let mainConfig = new Gtk.Expander();
    mainConfig.set_label("Main settings");
    mainConfig.add(this._generateMainSettings());
    this.attach(mainConfig, 0, 0, 1, 9);

    this.attach(new Gtk.Separator( { orientation: Gtk.Orientation.HORIZONTAL } ), 0, 10, 1, 1);
    let keyExpander = new Gtk.Expander();
    keyExpander.set_label("Keyboard Shortcuts");
    keyExpander.add(this._createKeyboardConfig());
    this.attach(keyExpander, 0, 11, 1, 9);

    this.attach(new Gtk.Separator( { orientation: Gtk.Orientation.HORIZONTAL } ), 0, 20, 1, 1);
    let appExpander = new Gtk.Expander();
    appExpander.set_label("Applications");
    appExpander.add(new PutWindowLocationWidget(this._wnckScreen));
    this.attach(appExpander, 0, 21, 1, 10000);
  },

  _createCornerChangesCombo: function() {
    this._model = new Gtk.ListStore();
    this._model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    let combo = new Gtk.ComboBox({ model: this._model, halign: Gtk.Align.END});

    let currentValue = Utils.getNumber(Utils.CORNER_CHANGE, 0);

    let values = [
      ["0", "Both"],
      ["1", "Only height"],
      ["2", "Only width"]
    ]
    let selectMe = null;
    for (let i=0; i< values.length; i++) {
      let iter = this._model.append();
      this._model.set(iter, [0, 1], values[i]);
      if (values[i][0] == currentValue) {
        selectMe = iter;
      }
    }

    if (selectMe != null) {
      combo.set_active_iter(selectMe);
    }

    let renderer = new Gtk.CellRendererText();
    combo.pack_start(renderer, true);
    combo.add_attribute(renderer, 'text', 1);
    combo.connect("changed", Lang.bind(this,
      function(obj) {
        let[success, iter] = obj.get_active_iter();
        if (!success) {
          return;
        }
        Utils.setParameter(Utils.CORNER_CHANGE, this._model.get_value(iter, 0));
      })
    );
    return combo;
  },

  _addSliders: function(grid, row, labels, configName) {
    for (let i=0; i < labels.length; i++) {
      row++;
      grid.attach(new Gtk.Label({label: labels[i], halign:Gtk.Align.START, margin_left: 15 }), 0, row, 1, 1);
      grid.attach(createSlider(configName + "-" + i), 1, row, 5, 1);
    }
    return row;
  },

  _generateMainSettings: function() {
    let ret = new Gtk.Grid();
    ret.width = 6;
    ret.column_homogeneous = true;
    this.set_margin_left(5);
    this.set_margin_right(5);

    let row = 0;

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      label: "Always use multiple widths:",
      tooltip_text:"Disable this option to move to other screen if possible",
    }), 0, row, 4, 1);

    let alwaysSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    alwaysSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_USE_WIDTHS, false));
    alwaysSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_USE_WIDTHS, obj.get_active()); });

    ret.attach(alwaysSwitch, 5, row, 1, 1);
    row++;

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      label: "First maximize then move to center:",
      tooltip_text: "'Move to center' maximizes the current window, and centers maximized windows",
    }), 0, row, 4, 1);

    let centerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    centerSwitch.set_active(Utils.getBoolean(Utils.REVERSE_MOVE_CENTER, false));
    centerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.REVERSE_MOVE_CENTER, obj.get_active()); });
    ret.attach(centerSwitch, 5, row, 1, 1);
    row++;

    ret.attach(new Gtk.Label({
      label: "Adjust window width and height when moved to corner:",
      tooltip_text:"Change width and height when moving to corner?",
      halign: Gtk.Align.START
    }), 0, row, 4, 1);

    let combo = this._createCornerChangesCombo();
    ret.attach(combo, 5, row, 1, 1);

    row++;
    ret.attach(new Gtk.Label({label: "<b><u>Center</u></b>", halign: Gtk.Align.START, margin_left: 2, use_markup: true }), 0, row, 2, 1);
    row++;
    ret.attach(new Gtk.Label({label: "Width:", halign: Gtk.Align.START, margin_left: 10 }), 0, row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_WIDTH), 1, row, 5, 1);
    row++;
    ret.attach(new Gtk.Label({label: "Height:", halign: Gtk.Align.START, margin_left: 10 }), 0, row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_HEIGHT), 1, row, 5, 1);
    row++;

    let labels = ["First:", "Second: ", "Third:"];
    // ------------------------------------- north ----------------------------------------
    row++;
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row, 6, 1);

    row++;
    ret.attach(new Gtk.Label({label: "<b><u>North</u></b>", halign:Gtk.Align.START, margin_left:2, use_markup: true})


      , 0, row, 2, 1);
    row = this._addSliders(ret, row, labels, "north-height");

    // ------------------------------------- south ----------------------------------------
    row++;
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row, 6, 1);
    row++;
    ret.attach(new Gtk.Label({label: "<b><u>South:</u></b>", use_markup: true, halign:Gtk.Align.START, margin_left: 2 }), 0, row, 2, 1);
    row = this._addSliders(ret, row, labels, "south-height");

    // ------------------------------------- west ----------------------------------------
    row++;
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row, 6, 1);
    row++;
    ret.attach(new Gtk.Label({label: "<b><u>West:</u></b>", use_markup: true, halign:Gtk.Align.START, margin_left: 2 }), 0, row, 2, 1);
    row = this._addSliders(ret, row, labels, "left-side-widths");

    // ------------------------------------- east ----------------------------------------
    row++;
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row, 6, 1);
    row++;
    ret.attach(new Gtk.Label({label: "<b><u>East:</u></b>", use_markup: true, halign:Gtk.Align.START, margin_left: 2 }), 0, row, 2, 1);
    row = this._addSliders(ret, row, labels, "right-side-widths");

    return ret;
  },

  _createKeyboardConfig: function() {
    let model = new Gtk.ListStore();

    model.set_column_types([
      GObject.TYPE_STRING,
      GObject.TYPE_STRING,
      GObject.TYPE_INT,
      GObject.TYPE_INT
    ]);

    let bindings = {
        "put-to-corner-ne": "Move to top right corner",
        "put-to-corner-nw": "Move to top left corner",
        "put-to-corner-se": "Move to bottom right corner",
        "put-to-corner-sw": "Move to bottom left corner",
        "put-to-side-n": "Move to top",
        "put-to-side-e": "Move right",
        "put-to-side-s": "Move to bottom",
        "put-to-side-w": "Move to left",
        "put-to-center": "Move to center/maximize",
        "put-to-location": "Move to configured location",
        "put-to-left-screen": "Move to the left screen",
        "put-to-right-screen": "Move to the right screen"
    };

    for (name in bindings) {
      let [key, mods] = Gtk.accelerator_parse(Utils.get_strv(name, null)[0]);
      let row = model.insert(10);
      model.set(row, [0, 1, 2, 3], [name, bindings[name], mods, key ]);
    }

    let treeview = new Gtk.TreeView({
      'expand': true,
      'model': model
    });

    // Action column
    let cellrend = new Gtk.CellRendererText();
    let col = new Gtk.TreeViewColumn({ 'title': 'Action', 'expand': true });
    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 1);
    treeview.append_column(col);

    // keybinding column
    cellrend = new Gtk.CellRendererAccel({
      'editable': true,
      'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', function(rend, iter, key, mods) {
      let value = Gtk.accelerator_name(key, mods);
      let [succ, iterator ] = model.get_iter_from_string(iter);

      if(!succ) {
        throw new Error("Error updating Keybinding");
      }

      let name = model.get_value(iterator, 0);

      model.set(iterator, [ 2, 3], [ mods, key ]);
      Utils.set_strv(name, [value]);
    });

    col = new Gtk.TreeViewColumn({'title': 'Modify'});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, 'accel-mods', 2);
    col.add_attribute(cellrend, 'accel-key', 3);

    treeview.append_column(col);

    return treeview;
  }
});

const PutWindowLocationWidget = new GObject.Class({
  Name: 'PutWindow.Prefs.PutWindowLocationWidget',
  GTypeName: 'PutWindowLocationWidget',
  Extends: Gtk.Box,
  _init: function(wnckScreen) {
    this.parent();
    this._wnckScreen = wnckScreen
    this.width = 4;
    this.margin = 4;
    this.orientation= Gtk.Orientation.HORIZONTAL;
    this.column_homogeneous = true;

    this._selectedApp = null;
    this._apps = [];

    this.treeModel = new Gtk.ListStore();
    this.treeModel.set_column_types([GObject.TYPE_STRING]);

    this.treeView = new Gtk.TreeView({model: this.treeModel, headers_visible: false});

    this.treeView.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);
    let column = new Gtk.TreeViewColumn({ min_width: 150 });
    let renderer = new Gtk.CellRendererText();
    column.pack_start(renderer, true);
    column.add_attribute(renderer, 'text', 0);

    let appsLength = 1;
     if (Utils.getParameter("locations", null) != null) {
      let apps = Object.getOwnPropertyNames(Utils.getParameter("locations"));
      appsLength = apps.length;
      apps.sort();
      for(let i=0; i< appsLength; i++) {
        let iter = this.treeModel.append();
        this.treeModel.set(iter, [0], [ apps[i] ]);
        this._apps.push({name: apps[i], listElement: iter});
      }
    }

    this.treeView.append_column(column);

    this.treeView.get_selection().connect("changed",
      Lang.bind(this, function(selection) {
        let s = selection.get_selected();
        // no new selection
        if (!s[0]) {
          return;
        }
        let selectedValue = s[1].get_value(s[2], 0);
        if (this._selectedApp != null && this._selectedApp == selectedValue) {
          return;
        }

        this._removeAppButton.set_sensitive(true);
        this._updateAppContainerContent(selectedValue, this.createAppWidgets(selectedValue));
      })
    );

    let toolbar = new Gtk.Toolbar({});
    toolbar.set_icon_size(Gtk.IconSize.MENU);
    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR)

    this._removeAppButton = new Gtk.ToolButton( {stock_id: Gtk.STOCK_REMOVE} );
    this._removeAppButton.set_sensitive(false);
    this._removeAppButton.set_tooltip_text("Remove an existing application");

    this._removeAppButton.connect("clicked",
      Lang.bind(this, function() {

        let dialog = new Gtk.MessageDialog({
          modal: true,
          message_type: Gtk.MessageType.QUESTION,
          title: "Delete application '" + this._selectedApp + "'?",
          text: "Are you sure to delete the configuration for  '" + this._selectedApp + "'?"
        });

        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_DELETE, Gtk.ResponseType.DELETE_EVENT);

        dialog.connect("response",
          Lang.bind(this, function(dialog, responseType) {
            if (responseType == Gtk.ResponseType.DELETE_EVENT) {
              for (let i=0; i< this._apps.length; i++) {
                if (this._apps[i].name != this._selectedApp) {
                  continue;
                }
                // remove the widget
                if (this._appContainer.get_child()) {
                  this._appContainer.get_child().destroy();
                }
                // remove the list entry
                this.treeModel.remove(this._apps[i].listElement);
                // unset the parameter
                Utils.unsetParameter("locations." + this._apps[i].name);
                // remove the entry from _apps array
                this._apps.pop(this._apps[i]);
                break;
              }
            }
          })
        );
        dialog.run();
        dialog.destroy();

      })
    );

    this._addAppButton = new Gtk.ToolButton( {stock_id: Gtk.STOCK_ADD} );
    this._addAppButton.set_tooltip_text("Add a new application (make sure it is runnging)");
    this._addAppButton.connect("clicked",
      Lang.bind(this, function() {

        let dialog = new Gtk.MessageDialog({
          modal: false,
          message_type: Gtk.MessageType.QUESTION,
          title: "Add application",
          text: "Please select the application you want to add"
        });

        let appModel = new Gtk.ListStore();
        appModel.set_column_types([ GObject.TYPE_INT, GObject.TYPE_STRING ]);

        let appSelector = new Gtk.ComboBox({ model: appModel, hexpand: true });
        appSelector.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);

        let renderer = new Gtk.CellRendererText();
        appSelector.pack_start(renderer, true);
        appSelector.add_attribute(renderer, 'text', 1);

        let apps = this._getRunningApps(this._apps);
        let appsLength = apps.length;

        for (let i = 0; i < appsLength; i++ ) {
          let iter = appModel.append();
          appModel.set(iter, [0, 1], apps[i] );
        }

        appSelector.connect('changed',
          Lang.bind(this, function(combo) {
            let selection = combo.get_model().get_value(combo.get_active_iter()[1], 1);
            let configPath = "locations." + selection;
            Utils.setParameter(configPath, Utils.START_CONFIG);

            this._addToTreeView(selection, true);

            this._updateAppContainerContent(selection, this.createAppWidgets(selection));
            dialog.destroy();
          })
        );
        //box.pack_start(appSelector, true, true, 2);

        dialog.get_action_area().add(appSelector);
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);

        dialog.set_default_size(350, 100);
        dialog.show_all();
        dialog.run();
        dialog.destroy();
      })
    );

    this._saveButton = new Gtk.ToolButton({stock_id: Gtk.STOCK_SAVE});
    //this._saveButton.set_use_stock(true);
    this._saveButton.set_tooltip_text("'Applications' config is not saved automatically.")
    this._saveButton.connect("clicked", function() {
      Utils.saveSettings();
    });

    toolbar.insert(this._removeAppButton, 0);
    toolbar.insert(this._addAppButton, 1);
    toolbar.insert(this._saveButton, 2);

    let leftPanel = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    leftPanel.pack_start(this.treeView, true, true, 0);
    leftPanel.pack_start(toolbar, false, false, 0);

    this.add(leftPanel);

    this._appContainer = new Gtk.Frame({ hexpand: true});
    this._appContainer.add(new Gtk.Label({label: _("Select an application to configure using the list on the left side.") }));
    let scroll = new Gtk.ScrolledWindow({
      'vexpand': true
    });
    scroll.add_with_viewport(this._appContainer);
    this.add(scroll);
  },

  _getRunningApps: function(exclude) {

    let windows = this._wnckScreen.get_windows();

    let winSize = windows.length;
    let apps = [];
    for (let i=0; i < winSize; i++) {
      apps.push( windows[i].get_class_group_name() );
    }
    apps.push("All");

    let ret = [],
      exludeLength = exclude.length;

    for (let i=0; i < apps.length; i++) {
      let wm =  apps[i],
        found = false;
      // dont add excluded entries to the returned value
      for (let j=0; j < exludeLength; j++) {
        if (exclude[j].name == wm || wm == "Update-notifier") {
          found = true;
          break;
        }
      }

      if (!found) {
        ret.push( [ret.length, wm]);
      }
    }

    ret.sort(function(a, b){
        return  a[1] < b[1] ? -1
            : a[1]==b[1] ? 0 : 1;
    });

    return ret;
  },

  createAppWidgets: function(appName) {

    let configLocation = "locations." + appName + ".";

    let ret = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 10 });

    let autoMoveBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL});
    autoMoveBox.pack_start(new Gtk.Label({label: "Auto-Move window when created", xalign: 0}), true, true, 0);

    let btn = new Gtk.Switch({ active: Utils.getBoolean(configLocation + "autoMove", false) });
    btn.connect("notify::active", function(sw) {
      Utils.setParameter(configLocation + "autoMove", sw.get_active());
    })
    autoMoveBox.pack_end(btn, false, false, 0);

    ret.pack_start(autoMoveBox, false, false, 0);


    // widgets for the positions defined for the app
    let positions = Utils.getParameter(configLocation + "positions", { positions: []});
    let positionSize = positions.length;

    this.locationBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    for (let i = 0; i < positionSize; i++) {
      this.locationBox.pack_start(this._generateOnePositionWidgets(configLocation, i, positionSize), false, false, 0);
    }
    ret.pack_start(this.locationBox, false, false, 0);

    return ret;
  },

  _updateAppContainerContent: function(appName, widget) {
    this._selectedApp = appName;
    if (this._appContainer.get_child()) {
      this._appContainer.get_child().destroy();
    }
    this._appContainer.add(widget);
    this._appContainer.show_all();
  },

  _addToTreeView: function(value, select) {
    let iter = this.treeModel.append();
    this.treeModel.set(iter, [0], [ value ]);
    this._apps.push({name: value, listElement: iter});

    if (select && select == true) {
      this.treeView.get_selection().select_iter(iter);
      this._selectedApp = value;
    }
  },

  _generateOnePositionWidgets: function(configLocation, index, positionSize) {

    let loc = configLocation + "positions." + index + ".",
        top = 0;

    let grid = new Gtk.Grid({ hexpand: true});
    grid.locationIndex = index;
    // screen ComboBox
    let screenModel = new Gtk.ListStore();
    screenModel.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

    let screenSelector = new Gtk.ComboBox({ model: screenModel, hexpand: true, margin_top: 6, margin_bottom: 6 });
    screenSelector.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);

    let screenSelectRenderer = new Gtk.CellRendererText();
    screenSelector.pack_start(screenSelectRenderer, true);
    screenSelector.add_attribute(screenSelectRenderer, 'text', 0);

    let numScreens =  Gdk.Screen.get_default().get_n_monitors();
    for (let j = 0; j < numScreens; j++ ) {
      let iter = screenModel.append();
      screenModel.set(iter, [0, 1], ["Screen " + (j+1), j]);
    }

    screenSelector.set_active(Utils.getNumber(loc + "screen", 0));
    screenSelector.connect('changed',
      Lang.bind(this, function(combo) {
        Utils.setParameter(loc + "screen", combo.get_model().get_value(combo.get_active_iter()[1], 1));
      })
    );

    grid.attach(new Gtk.Label({label: "Screen", xalign: 0}), 0, top, 3, 1);
    grid.attach(screenSelector, 3, top, 1, 1);

    // add/delete buttons
    let buttonContainer = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
    let addButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_ADD });
    addButton.connect("clicked",
      Lang.bind(this, function() {

        let length = Utils.getParameter(configLocation + "positions", []).length;
        let newLocation = configLocation + "positions." + length;
        Utils.setParameter(newLocation, {x: 0, y: 0, width: 100, height: 100, screen: 0} );

        this.locationBox.pack_start(this._generateOnePositionWidgets(configLocation, length, length), false, false, 0);
        this.locationBox.show_all();
      })
    );
    buttonContainer.pack_end(addButton, false, false, 0)

    // don't delete the first position
    if (index > 0) {
      let deleteButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_REMOVE });
      deleteButton.connect("clicked",
        Lang.bind(this, function() {
          Utils.unsetParameter(configLocation + "positions." + index);
          this.locationBox.remove(grid);

        })
      );
      buttonContainer.pack_end(deleteButton, false, false, 0)
    }

    grid.attach(buttonContainer, 4, top, 1, 1);

    // sliders for widht, height, x, y
    top++;
    let scaleW = createSlider(loc + "width");
    grid.attach(new Gtk.Label({label: "width", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleW, 1, top, 4, 1);

    top++;
    let scaleH = createSlider(loc + "height");
    grid.attach(new Gtk.Label({label: "Height", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleH, 1, top, 4, 1);

    top++;
    let scaleX = createSlider(loc + "x");
    grid.attach(new Gtk.Label({label: "X-Position", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleX, 1, top, 4, 1);

    top++;
    let scaleY = createSlider(loc + "y");
    grid.attach(new Gtk.Label({label: "Y-Position", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleY, 1, top, 4, 1);

    if (index < (positionSize -1 )) {
      top++;
      grid.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, top, 6, 1);
    }
    return grid;
  }
})


function init() {

}

function buildPrefsWidget() {
    let widget = new PutWindowSettingsWidget();
    widget.show_all();
    return widget;
};
