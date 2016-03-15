/*!
 * Copyright 2010 - 2016 Pentaho Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  "./SpecificationScope",
  "../i18n!types",
  "../lang/Base",
  "../lang/_AnnotatableLinked",
  "../util/error",
  "../util/arg",
  "../util/object",
  "../util/promise"
], function(SpecificationScope, bundle, Base, AnnotatableLinked, error, arg, O, promiseUtil) {
  "use strict";

  // Unique type class id exposed through Type#uid and used by Context instances.
  var _nextUid = 1,
      _extractShortId = /^pentaho\/type\/(\w+)$/i,
      _type = null,
      _normalAttrNames = [
        "label", "description", "category", "helpUrl", "isBrowsable", "isAdvanced", "styleClass", "ordinal"
      ],
      O_isProtoOf = Object.prototype.isPrototypeOf;

  /**
   * @name pentaho.type.Type
   * @class
   *
   * @classDesc The base **type class** of the types of the Pentaho Client Metadata Model.
   *
   * For additional information, see the class of _instances_, {@link pentaho.type.Instance}.
   *
   * @description _Initializes_ the type's singleton object.
   * @param {Object} spec The specification of this type.
   * @param {!Object} keyArgs Keyword arguments.
   * @param {!pentaho.type.Instance} keyArgs.instance The _prototype_ of the `Instance` class associated with
   * this type.
   * @param {boolean} [keyArgs.isRoot=false] Indicates if the type is a _root_ type.
   *
   */
  var Type = Base.extend("pentaho.type.Type", /** @lends pentaho.type.Type# */{

    constructor: function(spec, keyArgs) {
      if(!spec) spec = {};

      this._init(spec, keyArgs);

      this.extend(spec);

      this._postInit(spec, keyArgs);
    },

    /**
     * Performs initialization tasks that take place before the instance is extended with its specification.
     *
     * This method is typically overridden to block the inheritance of certain attributes.
     *
     * @param {!Object} spec The specification of this type.
     * @param {!Object} keyArgs Keyword arguments.
     * @param {!pentaho.type.Instance} keyArgs.instance The _prototype_ of the `Instance` class associated with
     * this type.
     * @param {boolean} [keyArgs.isRoot=false] If `true`, creates a _root_ type.
     * @protected
     * @overridable
     */
    _init: function(spec, keyArgs) {

      O.setConst(this, "uid", _nextUid++);

      // Bind
      var instance = arg.required(keyArgs, "instance", "keyArgs");
      O.setConst(instance, "_type", this);
      O.setConst(this, "instance",  instance);

      if(arg.optional(keyArgs, "isRoot"))
        O.setConst(this, "root", this);

      // Block inheritance, with default values
      this._id         = null;
      this._shortId    = undefined;
      this._styleClass = null;
    },

    /**
     * Performs initialization tasks that take place after the instance is extended with its specification.
     *
     * This method is typically overridden to validate the values of the attributes.
     *
     * The default implementation does nothing.
     *
     * @param {!Object} spec The specification of this type.
     * @param {!Object} keyArgs Keyword arguments.
     * @protected
     * @overridable
     */
    _postInit: function(spec, keyArgs) {
    },

    //region uid property
    /**
     * Gets the unique id of this type.
     *
     * Unique type ids are auto-generated, in each session.
     *
     * Note that even anonymous types -
     * those whose {@link pentaho.type.Type#id} is `null` -
     * have an unique-id.
     *
     * This attribute is _not_ inherited.
     *
     * @type number
     * @readonly
     */
    uid: -1, // set in _init
    //endregion

    //region context property
    /**
     * Gets the context where this type is defined.
     *
     * @name context
     * @memberOf pentaho.type.Type#
     * @type pentaho.type.Context
     * @readonly
     * @abstract
     */
    //endregion

    //region root property
    // `root` is generally set on direct sub-classes of Instance.
    // Should be the first meaningful, non-abstract instance class below `Instance` along a given branch.
    /**
     * Gets the root type of this type hierarchy.
     *
     * Even though the ultimate type root of types defined in this
     * system is [Instance]{@link pentaho.type.Instance},
     * the system is designed to represent multiple type hierarchies,
     * each representing concrete, more meaningful concepts.
     *
     * When deriving a type from `Instance`,
     * it can be marked as the _root_ of a type hierarchy,
     * by specifying the `isRoot` keyword argument to `extend`.
     *
     * Typically, root types are immediate subtypes of `Instance`.
     * However, this is not enforced and it is up to the developer to decide
     * at what level a practical, meaningful type root arises.
     *
     * For example, [Value]{@link pentaho.type.Value} is the root of _value_ types.
     * However, [Property]{@link pentaho.type.Property},
     * also an immediate subtype of `Instance`,
     * is not considered a root type.
     * It is the immediate subtypes of `Property` -
     * each root property within a complex type -
     * which are considered roots.
     * This aligns with users expectations of what an attribute named `root`
     * in a property type should mean.
     *
     * @name root
     * @memberOf pentaho.type.Type#
     * @type pentaho.type.Type
     * @readonly
     * @see pentaho.type.Type#isRoot
     * @see pentaho.type.Type#ancestor
     */

    /**
     * Gets a value that indicates if this type is the root of its type hierarchy.
     *
     * @type boolean
     *
     * @readonly
     *
     * @see pentaho.type.Type#root
     */
    get isRoot() {
      return this === this.root;
    },
    //endregion

    //region ancestor property
    /**
     * Gets the parent type in the current type hierarchy, if any, or `null`.
     *
     * The root type returns `null`.
     *
     * @type ?pentaho.type.Type
     * @readonly
     * @see pentaho.type.Type#root
     */
    get ancestor() {
      return this.isRoot ? null : Object.getPrototypeOf(this);
    },
    //endregion

    //region instance property
    // Set on `Instance._extend`
    /**
     * Gets the _prototype_ of the instances of this type.
     *
     * @name instance
     * @memberOf pentaho.type.Type#
     * @type pentaho.type.Instance
     * @readOnly
     * @see pentaho.type.Instance#type
     */
    //endregion

    //region id property

    // -> nonEmptyString, Optional(null), Immutable, Shared (note: not Inherited)
    // "" -> null conversion

    _id: null,

    /**
     * Gets the id of this type.
     *
     * Can only be specified when extending a type.
     *
     * The id only exists for types which have an associated AMD/RequireJS module.
     * However, note that all have a {@link pentaho.type.Type#uid}.
     *
     * This attribute is not inherited.
     *
     * @type {?nonEmptyString}
     * @readonly
     */
    get id() {
      return this._id;
    },

    set id(value) {
      value = nonEmptyString(value);

      // Is it a temporary id? If so, ignore it.
      if(value && value[0] === "_") value = null;

      // Can only be set once or throws.
      O.setConst(this, "_id", value);
    },

    /**
     * Gets the short id of this type.
     *
     * When a type is one of the standard types,
     * and, thus, it is a direct sub-module of the `pentaho/type` module,
     * its short id is its _local module id_,
     * like `"string"` or `"boolean"`.
     *
     * Otherwise, the short id is equal to the id.
     *
     * @type {?nonEmptyString}
     * @readOnly
     * @see pentaho.type.Type#id
     */
    get shortId() {
      var shortId = this._shortId, id, m;
      if(shortId === undefined) {
        if((id = this._id) && (m = _extractShortId.exec(id))) {
          shortId = m[1];
        } else {
          shortId = null;
        }
      }

      return shortId;
    },

    _buildRelativeId: function(value) {
      // A module id.
      // Unless it starts with a "/", it's relative to this Type#id.
      // Relative:
      //   View
      //   ./View
      // Absolute:
      //   foo.js
      //   /View
      //   http:
      if(!/(^\w+:)|(^\/)|(\.js$)/.test(value)) {
        // Considered relative.
        // Also works well if the value has ./ or ../
        var id = this.id;
        value = (id ? (id + "/") : "") + value;
      }

      return value;
    },
    //endregion

    //region label property
    // @type !nonEmptyString
    // -> nonEmptyString, Optional, Inherited, Configurable, Localized
    // null or "" -> undefined conversion

    _label: null,

    /**
     * Gets or sets the label of this type.
     *
     * Attempting to set to a non-string value type implicitly converts the value to a string before assignment.
     *
     * Setting to an empty string
     * or to a {@link Nully} value causes the attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the label is `null`.
     *
     * @type {?nonEmptyString}
     */
    get label() {
      return this._label;
    },

    set label(value) {
      value = nonEmptyString(value);

      // null or "" -> undefined conversion
      if(value == null) {
        this._resetLabel();
      } else {
        this._label = value;
      }
    },

    _resetLabel: function() {
      if(this !== _type) {
        delete this._label;
      }
    },
    //endregion

    //region description property

    // -> nonEmptyString, Optional, Inherited, Configurable, Localized
    // "" -> null conversion

    _description: null, // set through implement bundle, below

    /**
     * Gets or sets the description of this type.
     *
     * Attempting to set to a non-string value type implicitly converts the value to a string before assignment.
     *
     * Setting to `undefined` causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where this attribute is `null`.
     *
     * Setting to `null` or to an empty string clears the attribute and sets it to `null`, ignoring any inherited value.
     *
     * @type {?nonEmptyString}
     */
    get description() {
      return this._description;
    },

    set description(value) {
      if(value === undefined) {
        this._resetDescription();
      } else {
        this._description = nonEmptyString(value);
      }
    },

    _resetDescription: function() {
      if(this !== _type) {
        delete this._description;
      }
    },
    //endregion

    //region category property

    // -> nonEmptyString, Optional, Inherited, Configurable, Localized
    // "" -> null conversion

    _category: null,

    /**
     * Gets or sets the category associated with this type.
     *
     * The category is used primarily to group similar types (or instances of) in a user interface.
     *
     * Attempting to set to a non-string value type implicitly
     * converts the value to a string before assignment.
     *
     * Setting to `undefined` causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `null`.
     *
     * Setting to `null` or to an empty string clears the attribute and sets it to `null`,
     * thus ignoring any inherited value.
     *
     * @type {?nonEmptyString}
     * @see pentaho.type.Type#isBrowsable
     * @see pentaho.type.Type#ordinal
     */
    get category() {
      return this._category;
    },

    set category(value) {
      if(value === undefined) {
        this._resetCategory();
      } else {
        this._category = nonEmptyString(value);
      }
    },

    _resetCategory: function() {
      if(this !== _type) {
        delete this._category;
      }
    },
    //endregion

    //region helpUrl property

    // -> nonEmptyString, Optional, Inherited, Configurable, Localized?
    // "" -> null conversion

    _helpUrl: null,

    /**
     * Gets or sets an URL pointing to documentation associated with this type.
     *
     * Attempting to set to a non-string value type implicitly
     * converts the value to a string before assignment.
     *
     * Setting to `undefined` causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `null`.
     *
     * Setting to `null` or to an empty string clears the attribute and sets it to `null`,
     * ignoring any inherited value.
     *
     * @type {?nonEmptyString}
     */
    get helpUrl() {
      return this._helpUrl;
    },

    set helpUrl(value) {
      if(value === undefined) {
        this._resetHelpUrl();
      } else {
        this._helpUrl = nonEmptyString(value);
      }
    },

    _resetHelpUrl: function() {
      if(this !== _type) {
        delete this._helpUrl;
      }
    },
    //endregion

    //region isBrowsable property
    // @type boolean
    // -> boolean, Optional(true), Inherited, Configurable
    // undefined or null -> resets

    _isBrowsable: true,

    /**
     * Gets or sets the `isBrowsable` attribute of this type.
     *
     * Browsable types are exposed to the end user.
     * Set this attribute to `false` to prevent exposing the type in a user interface.
     *
     * Setting to a {@link Nully} value causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `true`.
     *
     * @type {boolean}
     */
    get isBrowsable() {
      return this._isBrowsable;
    },

    set isBrowsable(value) {
      if(value == null) {
        this._resetIsBrowsable();
      } else {
        this._isBrowsable = !!value;
      }
    },

    _resetIsBrowsable: function() {
      if(this !== _type) {
        delete this._isBrowsable;
      }
    },
    //endregion

    //region isAdvanced property
    // @type boolean
    // -> boolean, Optional(false), Inherited, Configurable
    // null || undefined -> reset
    _isAdvanced: false,

    /**
     * Gets or sets the `isAdvanced` attribute of this type.
     *
     * Types with `isAdvanced` attributes set to `false` are typically immediately accessible to the user.
     * An advanced type typically escapes the expected flow of utilization, yet it is
     * sufficiently relevant to be shown in a user interface.
     *
     * Setting to a {@link Nully} value causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `false`.
     *
     * @type {boolean}
     * @see pentaho.type.Type#isBrowsable
     */
    get isAdvanced() {
      return this._isAdvanced;
    },

    set isAdvanced(value) {
      if(value == null) {
        this._resetIsAdvanced();
      } else {
        this._isAdvanced = !!value;
      }
    },

    _resetIsAdvanced: function() {
      if(this !== _type) {
        delete this._isAdvanced;
      }
    },
    //endregion

    //region styleClass property
    // @type nonEmptyString
    // -> nonEmptyString, Optional(null), Configurable, Localized
    // "" or undefined -> null conversion

    _styleClass: null,

    /**
     * Gets or sets the CSS class associated with this type.
     *
     * This attribute is typically used to associate an icon with a type.
     *
     * Attempting to set to a non-string value type implicitly
     * converts the value to a string before assignment.
     *
     * An empty string or `undefined` value is interpreted as `null`.
     *
     * @type {?nonEmptyString}
     */
    get styleClass() {
      return this._styleClass;
    },

    set styleClass(value) {
      // undefined or "" -> null conversion
      this._styleClass = nonEmptyString(value);
    },

    // TODO: implement inheritedStyleClasses
    /**
     * Gets the style classes of this and any base types.
     *
     * @type string[]
     * @readonly
     */
    get inheritedStyleClasses() {
      throw error.notImplemented("Implement me!");
    },
    //endregion

    //region ordinal property
    // @type integer
    // -> Optional(0), Inherited, Configurable
    _ordinal: 0,

    /**
     * Gets or sets the ordinal associated with this type.
     *
     * The ordinal is used to disambiguate the order with which a type (or an instance of it)
     * is shown in a user interface.
     *
     * Setting to a {@link Nully} value causes this attribute to use the inherited value,
     * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `0`.
     *
     * @type {number}
     * @see pentaho.type.Type#isBrowsable
     * @see pentaho.type.Type#category
     */
    get ordinal() {
      return this._ordinal;
    },

    set ordinal(value) {
      if(value == null) {
        this._resetOrdinal();
      } else {
        this._ordinal = Math.floor((+value) || 0);
      }
    },

    _resetOrdinal: function() {
      if(this !== _type) {
        delete this._ordinal;
      }
    },
    //endregion

    //region view property

    // -> nonEmptyString, Optional, Inherited, Configurable, Localized
    // undefined -> inherit
    // null -> clear
    // "" -> null conversion

    _view: null, // {value: any, promise: Promise.<Class.<View>>}

   /**
    * Gets or sets the default view for instances of this type.
    *
    * When a string,
    * it is the id of the view's AMD module.
    * If the string starts with `/` or `xyz:`, or ends with `.js`,
    * the id is considered to be absolute,
    * otherwise,
    * it is relative to this type's id folder, and converted to an absolute id.
    *
    * Setting to `undefined` causes the view to be inherited from the ancestor type,
    * except for the root type, `Instance.type` (which has no ancestor), where the attribute is `null`.
    *
    * Setting to a _falsy_ value (like `null` or an empty string),
    * clears the value of the attribute and sets it to `null`, ignoring any inherited value.
    *
    * When a function,
    * it is the class or factory of the view.
    *
    * @see pentaho.type.Type#viewClass
    *
    * @type {string | function}

    * @throws {pentaho.lang.ArgumentInvalidTypeError} When the set value is not
    * a string, a function or {@link Nully}.
    */
    get view() {
      return this._view && this._view.value;
    },

    set view(value) {
      if(value === undefined) {
        this._resetView();
      } else if(!value) { // null || ""
        this._view = null;
      } else  if(typeof value === "string") {
        value = this._buildRelativeId(value);
        if(!this._view || this._view.value !== value) {
          this._view = {value: value, promise: null};
        }
      } else if(typeof value === "function") {
        // Assume it is the View class itself, already fulfilled.
        if(!this._view || this._view.value !== value) {
          this._view = {value: value, promise: Promise.resolve(value)};
        }
      } else {
        throw error.argInvalidType("view", ["nully", "string", "function"], typeof value);
      }
    },

    _resetView: function() {
      if(this !== _type) {
        delete this._view;
      }
    },

    /**
     * Gets a promise for the default view class or factory, if any, or `null`.
     *
     * A default view exists if property {@link pentaho.type.Type#view}
     * has a non-null value.
     *
     * @type Promise.<?function>
     * @readOnly
     * @see pentaho.type.Type#view
     */
    get viewClass() {
      /*jshint laxbreak:true*/
      var view = this._view;
      return view
          ? (view.promise || (view.promise = promiseUtil.require(view.value)))
          : Promise.resolve(null);
    },
    //endregion

    /**
     * Creates a subtype of this one.
     *
     * This method creates a type which does not have an own constructor.
     * The base type's constructor is used to _initialize_ the type.
     *
     * Do not use this method directly.
     * Use {@link pentaho.type.Instance#extendProto} instead.
     *
     * @param {object} spec The type specification.
     * @param {object} keyArgs Keyword arguments.
     * @param {pentaho.type.Instance} keyArgs.instance The prototype of instances of the type.
     *
     * @return {pentaho.type.Type} The new type.
     * @ignore
     */
    _extendProto: function(spec, keyArgs) {
      var subType = Object.create(this);

      // NOTE: `subType.constructor` is still the "base" constructor.
      subType.constructor(spec, keyArgs);

      return subType;
    },

    // TODO: Now that Property instances are never created,
    // only types with constructors get created.
    /**
     * Creates an instance of this type, given the construction arguments.
     *
     * @param {...any} args The construction arguments.
     * @return {pentaho.type.Instance} The created instance.
     */
    create: function() {
      var inst = Object.create(this.instance);
      inst.constructor.apply(inst, arguments);
      return inst;
    },

    /**
     * Determines if a value is an instance of this type.
     *
     * @param {?any} value The value to test.
     * @return {boolean} `true` if the value is an instance of this type, `false` otherwise.
     */
    is: function(value) {
      return O_isProtoOf.call(this.instance, value);
    },

    /**
     * Determines if this is a subtype of another.
     *
     * A type is considered a subtype of itself.
     *
     * @param {?pentaho.type.Type} superType The candidate super-type.
     * @return {boolean} `true` if this is a subtype of `superType` type, `false` otherwise.
     */
    isSubtypeOf: function(superType) {
      return !!superType && (superType === this || O_isProtoOf.call(superType, this));
    },

    // TODO: is conversion always successful? If so, should it be?
    /**
     * Converts a value to an instance of this type,
     * if it is not one already.
     *
     * If a {@link Nully} value is specified, `null` is returned.
     *
     * Otherwise, if a given value is not already an instance of this type
     * (checked using [is]{@link pentaho.type.Type#is}),
     * this method delegates the creation of an instance to
     * [create]{@link pentaho.type.Type#create}.
     *
     * @param {?any} value The value to convert.
     * @return {?pentaho.type.Instance} The converted value or `null`.
     */
    to: function(value) {
      return value == null   ? null  :
             this.is(value)  ? value :
             this.create(value);
    },

    //region serialization
    /**
     * Creates a top-level specification that describes this type.
     *
     * This method creates a new {@link pentaho.type.SpecificationScope} for describing
     * this type, and any other instances and types it references,
     * and then delegates the actual work to {@link pentaho.type.Type#toSpecInScope}.
     *
     * @param {Object} [keyArgs] - The keyword arguments object.
     * Passed to every type and instance serialized within this scope.
     *
     * Please see the documentation of subclasses for information on additional, supported keyword arguments.
     *
     * @return {!pentaho.type.spec.IType} A specification of this type.
     */
    toSpec: function(keyArgs) {
      if(!keyArgs) keyArgs = {};

      var scope = new SpecificationScope();
      var spec = this.toSpecInScope(scope, keyArgs);

      scope.dispose();

      return spec;
    },

    /**
     * Creates a specification that describes this type under a given scope.
     *
     * @param {!pentaho.type.SpecificationScope} scope - The specification scope.
     * @param {!Object} keyArgs - The keyword arguments object.
     * Passed to every type and instance serialized within this scope.
     *
     * Please see the documentation of subclasses for information on additional, supported keyword arguments.
     *
     * @return {!pentaho.type.spec.IType} A specification of this instance.
     *
     * @abstract
     *
     * @see pentaho.type.Instance#toSpec
     */
    toSpecInScope: function(scope, keyArgs) {
      throw error.notImplemented();
    },

    /**
     * Fills the given specification with this type's attributes local values,
     * under a given scope,
     * and returns whether any attribute was actually added.
     *
     * This method does _not_ add the special `id` and `base` attributes to the specification.
     *
     * @param {Object} spec - The specification to be filled.
     * @param {!pentaho.type.SpecificationScope} scope - The specification scope.
     * @param {!Object} keyArgs - The keyword arguments object.
     * Passed to every type and instance serialized within this scope.
     *
     * Please see the documentation of subclasses for information on additional, supported keyword arguments.
     *
     * @return {boolean} Returns `true` if any attribute was added, `false`, otherwise.
     *
     * @protected
     *
     * @see pentaho.type.Instance#toSpecInScope
     */
    _fillSpecInScope: function(spec, scope, keyArgs) {
      var any = false;

      // Normal attributes
      _normalAttrNames.forEach(function(name) {
        var _name = "_" + name, v;
        // !== undefined ensures refinement fields are well handled as well
        if(O.hasOwn(this, _name) && (v = this[_name]) !== undefined) {
          any = true;
          spec[name] = v;
        }
      }, this);

      // Custom attributes
      var viewInfo = O.getOwn(this, "_view");
      if(viewInfo) {
        any = true;
        spec.view = String(viewInfo.value);
      }

      return any;
    },

    /**
     * Returns a _reference_ to this type.
     *
     * This method returns a reference to this type that is appropriate
     * to be the value of an [inline type]{@link pentaho.type.spec.IInstance#_} property
     * that is included on a specification of an instance of this type.
     *
     * When a type is not anonymous, the cheapest reference,
     * the [id]{@link pentaho.type.Type#id}, is returned.
     *
     * For anonymous types, a temporary, serialization-only id is generated.
     * In the first occurrence in the given scope,
     * that id is returned, within a full specification of the type,
     * obtained by calling [toSpecInScope]{@link pentaho.type.Type#toSpecInScope}.
     * In following occurrences, only the previously used temporary id is returned.
     *
     * Some standard types have a special reference syntax,
     * e.g. [List.Type#toReference]{@link pentaho.type.List.Type#toReference}.
     *
     * @see pentaho.type.Type#toSpec
     *
     * @param {!pentaho.type.SpecificationScope} scope - The specification scope.
     * @param {!Object} keyArgs - The keyword arguments object.
     * Passed to every type and instance serialized within this scope.
     *
     * Please see the documentation of subclasses for information on additional, supported keyword arguments.
     *
     * @return {!pentaho.type.spec.UTypeReference} A reference to this type.
     */
    toReference: function(scope, keyArgs) {
      return this.shortId || scope.getIdOf(this) || this.toSpecInScope(scope, keyArgs);
    }
    //endregion
 }, /** @lends pentaho.type.Type */{

    //@override
    /**
     * See Base.js
     * @ignore
     */
    _subClassed: function(SubTypeCtor, instSpec, classSpec, keyArgs) {
      var SubInstCtor = keyArgs.instance.constructor;

      // Links SubTypeCtor and SubInstCtor and "implements" instSpec.
      SubTypeCtor._initInstCtor(SubInstCtor, instSpec, keyArgs);

      // Implement the given static interface.
      if(classSpec) SubTypeCtor.implementStatic(classSpec);
    },

    // Links TypeCtor (this) and the given InstCtor together and
    // applies the TypeCtor constructor to its own prototype, as a way to initialize it.
    // The constructor receives `instSpec` and ends up extending the prototype with it.
    // The static interface is not touched.
    //
    // NOTE: optionally receiving `keyArgs` as an optimization.
    // `_subClassed` is given a _derived_ `keyArgs`
    // that can/should be passed to `this`(constructor).
    _initInstCtor: function(InstCtor, instSpec, keyArgs) {

      O.setConst(InstCtor, "Type", this);

      this.call(this.prototype, instSpec, keyArgs || {instance: InstCtor.prototype});
    }
  })
  .implement(AnnotatableLinked);

  _type = Type.prototype;

  return Type;

  function nonEmptyString(value) {
    return value == null ? null : (String(value) || null);
  }
});
