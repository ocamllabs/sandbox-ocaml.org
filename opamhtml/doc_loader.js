var opamdoc_contents = 'body'

// utility - Parse query string
function parseParams(query) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decodeRE = /\+/g; // Regex for replacing addition symbol with a space
    var decode = function (str) {return decodeURIComponent( str.replace(decodeRE, ' ') );};
    query = query.replace(/&amp;/g, '&'); // <= THIS FIXES THE COW HTTP ESCAPING THE &s WHEN IT SHOULDN'T
    var params = {}, e;
    while ( e = re.exec(query) ) {
        var k = decode( e[1] ), v = decode( e[2] );
        if (k.substring(k.length - 2) === '[]') {
            k = k.substring(0, k.length - 2);
            (params[k] || (params[k] = [])).push(v);
        }
        else params[k] = v;
    }
    return params;
}

// utility - Fetch HTML from URL using ajax
function ajax(url, cont){
    console.log('AJAX request : ' + url);
    $.ajax({
        type: 'GET',
        url:url,
        async:true,
        dataType: 'html'
    }).done(function(data){
        cont($(data));
    }).fail(function(){
        console.log('AJAX request failed : ' + url);
    });
}

function Path(pathStr){

    var args = parseParams(pathStr);

    this.package = null;
    this.module = null;
    this.subnames = [];
    this.subkinds = [];
    this.class = null;
    this.type = null;

    if(typeof args.package !== 'undefined') {
        this.package = args.package;
        if(typeof args.module !== 'undefined') {
            var modstring = args.module;
            var names = [];
            var kinds = [];
            var done = false;
            var kind = 'module'
            var i = 0;
            while(!done) {
                var dot_index = modstring.indexOf('.');
                var colon_index = modstring.indexOf(':');
                if(dot_index > 0 && (dot_index < colon_index || colon_index < 0)) {
                    names[i] = modstring.substring(0, dot_index);
                    kinds[i] = kind;
                    kind = 'module';
                    modstring = modstring.substring(dot_index + 1);
                } else if(colon_index > -1) {
                    names[i] = modstring.substring(0, colon_index);
                    kinds[i] = kind;
                    kind = 'modtype';
                    modstring = modstring.substring(colon_index + 1);
                } else {
                    names[i] = modstring;
                    kinds[i] = kind;
                    done = true;
                }
                i++;
            }
            this.module = names[0];
            if(names.length > 1) {
                this.subnames = names.splice(1);
                this.subkinds = kinds.splice(1);
            }
            if(typeof args.class !== 'undefined') {
                this.class = args.class;
            }
            if(typeof args.type !== 'undefined') {
                this.type = args.type;
            }
        } 
    }
}

Path.prototype.name = function () {
    var name = null;
    if(this.package !== null) {
        name = this.package;
        if(this.module !== null) {
            name = this.module;
            if(this.subnames.length > 0){
                name += '.' + this.subnames.join('.');
            } 
            if(this.class !== null){
                name += '.' + this.class;
            } 
        }
    }        
    return name;
}

Path.prototype.fullName = function () {
    var fullName = null;
    if(this.package !== null) {
        fullName = 'Package ' + this.package;
        if(this.module !== null) {
            var module = this.module;
            if(this.subnames.length > 0){
                module += '.' + this.subnames.join('.');
            } 
            if(this.class !== null){
                fullName = 'Class ' + module + '.' + this.class;
            } else if (this.subkinds[this.subnames.length - 1] === 'modtype') {
                fullName = 'Module type ' + module;
            } else {
                fullName = 'Module ' + module;
            }
        }
    }        
    return fullName;
}

Path.prototype.url = function () { 
    var url = null;
    if(this.package !== null) {
        url = '?package=' + this.package;
        if(this.module !== null) {
            url += '&module=' + this.module;
            for(var i = 0; i < this.subnames.length; i++) {
                if(this.subkinds[i] === 'modtype') {
                    url += ':' + this.subnames[i];
                } else {
                    url += '.' + this.subnames[i];
                }
            } 
            if(this.class !== null){
                url += '&class=' + this.class;
            }
            if(this.type !== null){
                url += '&type=' + this.type;
            }
        }
    }        
    return url;
}

function Parent(path) {
    this.package = null;
    this.module = null;
    this.subnames = [];
    this.subkinds = [];
    this.class = null;
    this.type = null;

    if(path.package !== null) {
        if(path.module !== null) {
            this.package = path.package;
            if(path.subnames.length > 0 || path.class !== null) {
                this.module = path.module;
                if(path.class !== null) {
                    this.subnames = path.subnames;
                    this.subkinds = path.subkinds;
                } else {
                    this.subnames = path.subnames.slice(0, -1);
                    this.subkinds = path.subkinds.slice(0, -1);
                }
            }
        } 
    }
}

Path.prototype.parent = function () { return new Parent(this) }

Parent.prototype = Path.prototype

function PathVisitor(path) {
    this.path = path;
    this.subnames = path.subnames.slice(0);
    this.subkinds = path.subkinds.slice(0);
    this.class = path.class
}

PathVisitor.prototype.current = function (){
    if(this.subnames.length > 0) {
        return {kind: this.subkinds[0], name: this.subnames[0]};
    } else {
        if(this.class !== null) {
            return {kind: 'class', name: this.class};
        } else {
            return null;
        }
    }
}

PathVisitor.prototype.next = function (){
    if(this.subnames.length > 0) {
        this.subnames.shift();
        this.subkinds.shift();
    } else {
      this.class = null;
    }
    return this;
}

PathVisitor.prototype.concat = function(pv){
    this.subnames = this.subnames.concat(pv.subnames);
    this.subkinds = this.subkinds.concat(pv.subkinds);
    if(pv.class !== null) {
      this.class = pv.class;
    }
    return this;
}


function Page(path){
    this.path = path;
    this.alias = null;
    this.summary = null;
    this.body = null;
    this.constraints = null;
    this.jump = null;
}

Page.prototype.parent_link = function(){
    var parent = this.path.parent();
    var title = parent.name();
    var url = parent.url();
    if(title !== null && url !== null) {
        return $('<a>', 
                 {'class' : 'up', 
                  title   : title,
                  href    : url,
                  text    : 'Up' });
    }
    return null;
}

Page.prototype.title = function(){
    var alias = null;
    var sep = '';
    if(this.alias !== null) {
        if(this.path.modtype !== null) {
          sep = ' = ';
        } else {
          sep = ' : ';
        }
        alias = $('<a>', 
                  {href    : this.alias.url(),
                   text    : this.alias.name()});
    }
     
    return $('<h1>').append(this.path.fullName() + sep).append(alias);
}

function display_page(page){
    var plink = page.parent_link();
    var title = page.title();
    var summary = page.summary;
    var rule = $('<hr/>').attr('width','100%');
    var body = page.body;

    var content = $('<div>')
        .append(plink)
        .append(title)
        .append(summary)
        .append(rule)
        .append(body);

    if(page.jump !== null) {
        scrollTo(0, page.jump.position().top);
        page.jump.css('background', 'yellow');
    }

    $(opamdoc_contents).html(content);
}

function load_page(page, pv, data, cont) {

    var current = pv.current();

    if(current === null) {
        page.summary = $('> div.info', data).first();
        page.body = data;
        if(page.path !== pv.path) {
            page.alias = pv.path
        }
        if(page.path.type !== null)
        {
            var jump = $('pre > span.TYPE'+page.path.type, data);
	    if (jump.length == 0){
	        jump = $('pre > code > span.TYPE'+page.path.type, data);
	    }
	    if (jump.length > 0){
	        page.jump = jump;
	    }
        }
        cont(page);
    } else {

        var kind = current.kind;
        var name = current.name;

        var query = '> div.ocaml_' + kind + '[name=' + name + ']'
        var subdata = $(query, data)

        if(subdata.length === 0) {

	    var includes = $('> div.ocaml_include', data);

	    for (var i = 0; i < includes.length; i++){

	        var items = JSON.parse($(includes[i]).attr('items'));

	        if (items.indexOf(name) !== -1){
		    
		    var pathAttr = $(includes[i]).attr('path');

		    if (typeof pathAttr === 'undefined'){
		        var content = $('> div.ocaml_content', includes[i]);

			load_page(page, pv, content, cont);
		    } else {
		        var include_path = new Path(pathAttr.substring(1));
                        var include_pv = new PathVisitor(include_path);

                        var include_url = include_path.package + '/' + include_path.module +'.html'
                        
		        ajax(include_url, function(data){
                            load_page(page, include_pv.concat(pv), data, cont);
                        });
		    }
	        }
	    }
        } else {

	    var pathAttr = subdata.attr('path');

	    if (typeof pathAttr === 'undefined'){
	        var content = $('> div.ocaml_content', subdata);
	        
	        load_page(page, pv.next(), content, cont);
	    } else {
	       
		var alias_path = new Path(pathAttr.substring(1));
                var alias_pv = new PathVisitor(alias_path);

                var alias_url = alias_path.package + '/' + alias_path.module +'.html'

		ajax(alias_url, function(data){
                    load_page(page, alias_pv.concat(pv.next()), data, cont);
                });
	    }
        }
    }
}

function load_path(path, cont) {
    if(path.module !== null) {
        var url = path.package + '/' + path.module + '.html';
        ajax(url, function(data){
            var pg = new Page(path);
            var pv = new PathVisitor(path);
            
            load_page(pg, pv, data, cont);
        });
    } else {
        var url = path.package + '/index.html';
        ajax(url, function(data){
            var pg = new Page(path);
            pg.body = data;
            cont(pg);
        });
    }
}

function Expander(expanded, button, expansion) {
    if(expanded) { 
        button.html('-');
        expansion.show();
    } else { 
        button.html('+');
        expansion.hide();
    }
    this.expanded = expanded;
    this.button = button;
    this.expansion = expansion;
}

Expander.prototype.expand = function(expand){
    if(typeof expand === 'undefined') {
        expand = ! this.expanded;
    }
    if(expand !== this.expanded) {
        this.button.html(expand ? '-' : '+');
        if(expand) {
            this.expansion.show('fast');
        } else {
            this.expansion.hide('fast');
        }
        this.expanded = expand;
    }
}

function Group(parent) {
    if(typeof parent !== 'undefined'){
        this.cls = null;
        this.content = null;
        this.path = null;
        if(parent !== null) {
            this.depth = parent.depth + 1;
            this.icount = parent.icount;
            this.auto_expand = parent.auto_expand;
        } else {
            this.depth = 0;
            this.icount = 6;
            this.auto_expand = true;
        }
    }
}

Group.prototype.load_content = function(data){
    this.load_children(data);
    this.content = data;
}

Group.prototype.load_path = function(data){
    var pathAttr = data.attr('path');
    if(typeof pathAttr !== 'undefined') {
        this.path = new Path(pathAttr.substring(1));
    }
}

Group.prototype.decorate = function(node){
    var button = $('<button>').addClass('expander');
    var btn_cell = $('<td>').append(button);
    var node_cell = $('<td>').append(node.children()).width('100%');
    var node_row = $('<tr>').append(btn_cell).append(node_cell);
    var table = $('<table>')
        .addClass('expanding_' + this.cls)
        .width('100%')
        .append(node_row);
    if(this.content !== null) {
        table.append(this.content);
        var expander = new Expander(this.auto_expand, button, this.content);
        button.click(function () { expander.expand() });
    } else if(this.path !== null) {
        button.html('+');
        var self = this;
        var expand = function(page){
            self.load_content(page.body);
            table.append(self.content);
            var expander = new Expander(self.auto_expand, button, self.content);
            button.click(function () { expander.expand() });
            expander.expand(true);
        };
        if(this.auto_expand) {
            load_path(self.path, expand);
        } else {
            button.click(function () {
                button.off('click');
                load_path(self.path, expand);
            });
        }
    } else {
        button.html('+');
        button.attr('disabled', true);
    }
    node.append(table);
}

function IncludeGroup(parent, idx) {
    Group.call(this, parent);
    this.icount = (parent.icount + idx + 2) % 7;
    this.cls = 'include_' + this.icount;
    if(this.depth > 2) {
        this.auto_expand = false;
    }
}

IncludeGroup.prototype = new Group();

IncludeGroup.prototype.load_content = function(data) {
    this.load_children(data);
    var cell = $('<td>')
        .attr('colspan', '2')
        .css('padding', 0)
        .append(data);
    this.content = $('<tr>').append(cell);
}

function SigGroup(parent, idx) {
    Group.call(this, parent);
    this.icount = (parent.icount - idx - 1) % 7;
    this.cls = 'sig';
    this.auto_expand = false;
}

SigGroup.prototype = new Group();

SigGroup.prototype.load_content = function(data) {
    this.load_children(data);
    var edge_cell = $('<td>').addClass('edge_column');
    var cnt_cell = $('<td>').append(data);
    this.content = $('<tr>').append(edge_cell).append(cnt_cell);
}

Group.prototype.load_children = function(data, Kind, label){
    if(typeof Kind === 'undefined') {
        this.load_children(data, IncludeGroup, 'include');
        this.load_children(data, SigGroup, 'module');
        this.load_children(data, SigGroup, 'modtype');
        this.load_children(data, SigGroup, 'class');
    } else {
        var children = $('> div.ocaml_' + label, data);
        var self = this;
        children.each(function(idx) {
            var grp = new Kind(self, idx);
            var content = $('div.ocaml_content', $(this));
            if(content.length > 0) {
                grp.load_content(content);
            } else {
                grp.load_path($(this));
            }
            grp.decorate($(this));
        });
    }
}

$(document).ready(function () {
    var p = new Path(location.search.substring(1));
    var grp = new Group(null);
    load_path(p, function(page){
        grp.load_content(page.body);
        display_page(page);
    });
});
