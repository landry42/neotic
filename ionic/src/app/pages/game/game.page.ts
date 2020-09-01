import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController, AlertController, ActionSheetController, IonContent } from '@ionic/angular';
import { AngularFireDatabase } from '@angular/fire/database';
import { Subscription } from 'rxjs';
import { BookService } from 'src/app/services/book.service';
import { ChatService } from 'src/app/services/book/chat.service';
import { PopupService } from 'src/app/services/popup.service';
import { UserService } from 'src/app/services/user.service';
import { MediaService } from 'src/app/services/media.service';
import { ActorService } from 'src/app/services/book/actor.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
})
export class GamePage implements OnInit, OnDestroy {

  @ViewChild(IonContent, { static: true }) content: IonContent;

  bookId: string;
  sub: Subscription;
  line = -1;
  chat: {
    logs: any[];
    name: string;
    id: string;
  };
  chatLogs: any[] = [];
  logs: any[] = [];
  chatId = 'main';
  curHost = '';
  actors = {};
  loopMinTime = 1000;
  question = false;
  labels: any;
  exited = false;
  ended = false;
  paused = false;
  waitTime = 500;
  inputShowed = false;

  gochat = '';

  autoPlay = false;

  avatar = undefined;

  curLine = 0;

  speed = 1000; // CPS

  nextTimer: any;

  curLog: any;
  msg: string;
  command: string;
  opts: any[] = [];
  arg: any;
  args: any[];
  places = {};
  place = '';

  answers: string[];

  variables: any = {};

  cptChatLabel: any = {};

  settings: {
    mode: string
  } = {mode: 'next'};

  nomVar: string;
  nomVar1: string;
  nomVar2: string;
  varValue: any;
  varValue1: any;
  varValue2: any;

  checkLabelRefresher: any;

  autoScroll = true;

  @ViewChild('bg', {static: true, read: ElementRef}) bg: ElementRef;

  commonSub: Subscription;
  gameSub: Subscription;
  COMMON: any;
  GAME: any;

  input = '';

  time = 0;

  debug: boolean;

  actions: {name: string, key: string, color: string, chat: string, type: string}[];

  constructor(
    public bookService: BookService,
    public chatService: ChatService,
    public navCtrl: NavController,
    public database: AngularFireDatabase,
    public alertCtrl: AlertController,
    public actionSheetController: ActionSheetController,
    private popupService: PopupService,
    public userService: UserService,
    private alertController: AlertController,
    private mediaService: MediaService,
    private actorService: ActorService,
    private translator: TranslateService
    ) {
    }

  ngOnInit() {
    this.play();
    this.getTraduction();
  }

  getTraduction() {
    this.gameSub = this.translator.get('GAME').subscribe((val) => {
      this.GAME = val;
    });
    this.commonSub = this.translator.get('COMMON').subscribe((val) => {
      this.COMMON = val;
    });
  }

  ngOnDestroy() {
    this.gameSub.unsubscribe();
    this.commonSub.unsubscribe();
  }

  async play() {
    this.checkLabelRefresher = setInterval(() => {
      this.cptChatLabel = {};
    }, 60000);
    this.getWallpaper();
    this.inputShowed = false;
    this.question = false;
    this.paused = false;
    this.exited = false;
    this.settings.mode = 'next';
    this.logs = [];
    this.bookId = this.bookService.curBookId;
    this.debug = this.bookService.debug;
    if (!this.debug) {
      this.chatId = this.bookService.book.main;
    } else {
      this.chatId = this.bookService.curChatId;
    }
    if (this.userService.haveSave(this.bookId)) {
      await this.load();
      this.playChat(this.chatId, this.line);
    } else {
      this.line = 0;
      this.variables = {};
      this.playChat(this.chatId);
    }
  }

  async playChat(chatId = 'main', line = 0) {
    this.paused = false;
    this.settings.mode = 'next';
    this.line = line;
    this.chat = this.chatService.getChat(chatId);
    this.chatLogs = this.chat.logs;
    this.labels = this.getLabels();
    this.mediaService.loadSounds(this.getChatSounds());
    this.mediaService.loadAmbiances(this.getChatAmbiances());
    this.mediaService.loadMusics(this.getChatMusics());
    this.playLog();
  }

  async playLog() {
    console.log(this.curLog);
    if (!this.exited) {
      if (this.line < this.chatLogs.length) {
        this.gochat = '';
        this.curLine = this.line + 1;
        this.time = 1000;
        this.curLog = this.chatLogs[this.line];
        this.msg = this.curLog.msg;
        if (this.msg.charAt(0) === '/') {
          this.time = -this.waitTime;
          if (this.msg.charAt(1) !== '/') {
            this.getCommandValues(this.msg);
            this.nomVar = this.getVariableName(this.args[0]);
            this.nomVar1 = this.getVariableName(this.args[1]);
            this.nomVar2 = this.getVariableName(this.args[2]);
            this.varValue = this.toVariable(this.args[0]);
            this.varValue1 = this.toVariable(this.args[1]);
            this.varValue2 = this.toVariable(this.args[2]);
            switch (this.command) {
              case 'go':
                if (this.opts.includes('chat')) {
                  if (this.chatService.haveChat(this.arg)) {
                    if (this.checkCptLabel(this.chatService.getChatIdByName(this.arg))) {
                      this.gochat = this.arg;
                    }
                  }
                } else {
                  if (this.labels.hasOwnProperty(this.arg)) {
                    if (this.checkCptLabel(this.chat.id, this.arg)) {
                      this.curLine = this.labels[this.arg];
                    }
                  }
                }
                break;
              case 'chat':
                if (this.chatService.haveChat(this.arg)) {
                  if (this.checkCptLabel(this.chatService.getChatIdByName(this.arg))) {
                    this.gochat = this.arg;
                  }
                }
                break;
              case 'mode':
                this.settings.mode = this.args[0];
                this.paused = true;
                break;
              case 'place':
                this.place = this.roleToId(this.args[0]);
                this.getActions();
                break;
              case 'sound':
                if (this.opts.includes('stop')) {
                  if (this.args.length > 0) {
                    this.mediaService.stopSound(this.args[0]);
                  } else {
                    this.mediaService.stopSound();
                  }
                } else {
                  this.mediaService.playSound(this.args[0]);
                }
                break;
              case 'ambiance':
                if (this.opts.includes('stop')) {
                  if (this.args.length > 0) {
                    this.mediaService.stopAmbiance(this.args[0]);
                  } else {
                    this.mediaService.stopAmbiance();
                  }
                } else {
                  this.mediaService.playAmbiance(this.args[0]);
                }
                break;
              case 'stopsound':
                if (this.args.length > 0) {
                  this.mediaService.stopSound(this.args[0]);
                } else {
                  this.mediaService.stopSound();
                }
                break;
              case 'stopmusic':
                  if (this.args.length > 0) {
                    this.mediaService.stopMusic(this.args[0]);
                  } else {
                    this.mediaService.stopMusic();
                  }
                  break;
              case 'stopambiance':
                if (this.args.length > 0) {
                  this.mediaService.stopAmbiance(this.args[0]);
                } else {
                  this.mediaService.stopAmbiance();
                }
                break;
              case 'finish':
                this.curLine = this.chatLogs.length;
                this.ended = true;
                break;
              case 'alert':
                await this.popupService.alert(this.arg);
                await this.popupService.alerter.onDidDismiss();
                break;
              case 'wait':
                await this.wait(Number(this.arg));
                break;
              case 'music':
                if (this.opts.includes('stop')) {
                  this.mediaService.stopMusic();
                } else {
                  const once = this.opts.includes('once');
                  this.mediaService.playMusic(this.args[0], !once);
                }
                break;
              case 'input':
                this.paused = true;
                this.inputShowed = true;
                break;
              case 'question':
                this.paused = true;
                this.answers = this.getAnswers();
                this.question = true;
                setTimeout(() => this.scrollToBottom(), 100);
                break;
              case 'clear':
                this.logs = [];
                break;
              case 'else':
                this.curLine = this.getNextEndIf();
                break;
              case 'answer':
                if (String(this.toVariable('$answer')) !== String(this.toVariable(this.arg))) {
                  this.curLine = this.getNextAnswer();
                }
                break;
              case 'if':
                const endVal = this.varValue2;
                const operator = this.varValue1;
                const firstVal = this.varValue;
                if (operator === '==') {
                  if (String(firstVal) !== String(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else if (operator === '<') {
                  if (Number(firstVal) >= Number(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else if (operator === '<=') {
                  if (Number(firstVal) > Number(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else if (operator === '>') {
                  if (Number(firstVal) <= Number(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else if (operator === '>=') {
                  if (Number(firstVal) < Number(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else if (operator === ['!=', '!==']) {
                  if (Number(firstVal) === Number(endVal)) {
                    this.curLine = this.getNextEndIf();
                  }
                } else {
                  this.curLine = this.getNextEndIf();
                }
                break;
              case 'set':
                this.setVariable('set');
                break;
              case 'add':
                this.setVariable('add');
                break;
              case 'sub':
                this.setVariable('sub');
                break;
              case 'div':
                this.setVariable('div');
                break;
              case 'mul':
                this.setVariable('mul');
                break;
              case 'random':
                this.setVariable('random');
                break;
              case 'control':
                if (this.isActor(this.nomVar)) {
                  this.actorService.setOwnActor(this.toActorName(this.nomVar));
                }
                break;
              default:
            }
          }
        } else {
          this.logs.push(this.curLog);
          this.time = this.curLog.msg.length * 50;
        }
        const totalTime = this.time + this.waitTime;
        if ((this.autoPlay || totalTime === 0) && !this.paused) {
          this.next();
        }
      } else if (!this.ended) {
        if (this.autoPlay) {
          this.nextTimer = setTimeout(() => {
            if (this.bookService.entities[this.place]) {
              this.settings.mode = 'action';
              this.paused = true;
            } else {
              this.end();
            }
          }, this.waitTime);
        } else {
          if (this.bookService.entities[this.place]) {
            this.settings.mode = 'action';
            this.paused = true;
          } else {
            this.end();
          }
        }
      }
    }
  }

  roleToId(roleName: string) {
    roleName = roleName.replace('@', '');
    let res = '';
    const entity = this.bookService.entities[roleName];
    if (entity) {
      res = entity.target;
    }
    return res;
  }

  toggleAuto() {
    if (this.autoPlay === true) {
      this.playLog();
    }
  }

  getVariable() {
    return this.setVariable('get');
  }

  setVariable(operator) {
    if (this.isActor(this.args[0])) {
      const value = this.varValue1;
      const path = this.arg.split('$');
      const actorId = this.actorService.getActorId(this.toActorName(path[0]));
      const nomVar = path[1].split(' ')[0];
      if (!this.actors[actorId]) {
        this.actors[actorId] = {};
      }
      if (operator === 'set') {
        this.actors[actorId][nomVar] = value;
      } else if (operator === 'random') {
        this.actors[actorId][nomVar] = this.getRandom();
      }
      if (!this.actors[actorId][nomVar]) {
        this.actors[actorId][nomVar] = 0;
      }
      if (operator === 'add') {
        this.actors[actorId][nomVar] = Number(this.actors[actorId][nomVar]) + Number(value);
      } else if (operator === 'sub') {
        this.actors[actorId][nomVar] = Number(this.actors[actorId][nomVar]) - Number(value);
      } else if (operator === 'mul') {
        this.actors[actorId][nomVar] = Number(this.actors[actorId][nomVar]) * Number(value);
      } else if (operator === 'div') {
        this.actors[actorId][nomVar] = Number(this.actors[actorId][nomVar]) / Number(value);
      }
      return this.actors[actorId][nomVar];
    } else {
      const value = this.varValue1;
      if (operator === 'set') {
        this.variables[this.nomVar] = value;
      } else if (operator === 'random') {
        this.variables[this.nomVar] = this.getRandom();
      }
      if (!this.haveVariable(this.nomVar)) {
        this.variables[this.nomVar] = 0;
      }
      if (operator === 'add') {
        this.variables[this.nomVar] = Number(this.variables[this.nomVar]) + Number(value);
      } else if (operator === 'sub') {
        this.variables[this.nomVar] = Number(this.variables[this.nomVar]) - Number(value);
      } else if (operator === 'mul') {
        this.variables[this.nomVar] = Number(this.variables[this.nomVar]) * Number(value);
      } else if (operator === 'div') {
        this.variables[this.nomVar] = Number(this.variables[this.nomVar]) / Number(value);
      }
      return this.variables[this.nomVar];
    }
    return null;
  }

  toActorName(actorName: string): string {
    if (this.isActor(actorName)) {
      return actorName.substring(1, actorName.length);
    } else {
      return actorName;
    }
  }

  getRandom() {
    let min: number;
    let max: number;
    if (this.varValue2) {
      min = Math.floor(Number(this.varValue1));
      max = Math.floor(Number(this.varValue2)) + 1;
    } else {
      min = 0;
      max = Math.floor(Number(this.varValue1)) + 1;
    }
    const res = Math.floor(Math.random() * max) + min;
    return res;
  }

  isActor(actorName: string) {
    return actorName.charAt(0) === '@';
  }

  haveVariable(varValue) {
    return this.variables.hasOwnProperty(varValue);
  }

  getVariableName(val) {
    if (val) {
      if (val.charAt(0) === '$') {
        return val.substring(1, val.length);
      }
      return val;
    }
  }

  checkCptLabel(chatId = this.chat.id, labelName = 'main') {
    if (this.cptChatLabel.hasOwnProperty(chatId)) {
      if (this.cptChatLabel[chatId].hasOwnProperty(labelName)) {
        this.cptChatLabel[chatId][labelName] += 1;
        const cpt = this.cptChatLabel[chatId][labelName];
        if (cpt >= 10) {
          if (labelName === 'main') {
            if (this.bookService.debug) {
              this.popupService.alert(
                this.GAME.maxChatError
                );
            }
            return false;
          } else {
            if (this.bookService.debug) {
              this.popupService.alert(
                this.GAME.maxLabelError
                );
            }
            return false;
          }
        }
      } else {
        this.cptChatLabel[chatId] = {[labelName]: 1};
      }
    } else {
      this.cptChatLabel[chatId] = {main: 1};
    }
    return true;
  }

  scrollToBottom(autoScroll = false) {
    if (autoScroll) {
      this.autoScroll = true;
    }
    if (this.autoScroll) {
      setTimeout(() => {
        this.content.scrollToBottom(400);
        }, 100);
    }
  }

  async onScroll() {
    this.content.getScrollElement().then((scroll) => {
      if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight > 200) {
        this.autoScroll = false;
      } else {
        this.autoScroll = true;
      }
    });
  }

  getActions() {
    this.actions = [];
    let items = [];
    let places = [];
    if (this.place) {
      if (this.bookService.entities[this.place]) {
        items = this.bookService.entities[this.place].items;
        places = this.bookService.entities[this.place].places;
      }
    }
    if (items) {
      for (const itemId of items) {
        const item = this.bookService.entities[itemId];
        if (item) {
          const key = item.key;
          for (const roleId of item.roles) {
            const role: {actions: {name: string, chat: string, key: string, color: string, type: string}[]}
                        = this.bookService.entities[roleId];
            for (const action of Object.values(role.actions)) {
              action.key = key;
              action.color = this.bookService.entities[item.key].color;
              action.type = 'chat';
              this.actions.push(action);
            }
          }
        }
      }
    }
    if (places) {
      for (const placeId of places) {
        const place = this.bookService.entities[placeId];
        const action = {
          name: this.GAME.go,
          chat: place.id,
          type: 'go',
          key: place.key,
          color: place.color
        };
        this.actions.push(action);
      }
    }
    console.log({
      place: this.place,
      actions: this.actions,
      items
    });
  }

  getCommandValues(str: string) {
    const words: string[] = str.split(' ');
    const firstWord = words.shift();
    this.command = firstWord.slice(1);
    let opt = true;
    this.arg = '';
    this.args = [];
    this.opts = [];
    for (let word of words) {
      word = word.trim();
      if (word !== '') {
        if (word.charAt(0) === '-' && opt) {
          this.opts.push(word.slice(1));
        } else {
          if (opt) {
            opt = false;
            this.args.push(word);
          } else {
            this.args.push(word);
          }
        }
      }
    }
    this.arg = this.args.join(' ');
    return;
  }

  resume() {
    this.paused = false;
    this.next();
    // this.playLog();
  }

  getLabels() {
    const res = {};
    for (let i = 0; i < this.chatLogs.length; i++) {
      const log = this.chatLogs[i];
      const command: any[] = log.msg.split(' ');
      const labelCommand = command.shift();
      if (labelCommand === '/label') {
        const labelName = command.join(' ');
        res[labelName] = i;
      }
    }
    return res;
  }

  answerInit(count) {
    const res = [];
    for (let i = 0; i < count; i++) {
      res.push(0);
    }
    this.database.object('games/' + this.bookId + '/chat/' + this.bookService.curChatId).update({answers: res});
  }

  plus() {

  }

  save() {
    const save = {
      line: this.line,
      chatId: this.chatId,
      actor: this.actorService.ownActor,
      place: this.place,
      variables: this.variables,
      actors: this.actors,
      places: this.places,
      settings: this.settings,
      lastChanges: Date.now()
    };
    this.userService.addSave(this.bookId, save);
  }

  async load() {
    const save = await this.userService.loadSave(this.bookId);
    this.actorService.ownActor = save.actor;
    this.place = save.place;
    this.places = save.places;
    this.line = save.line;
    this.actors = save.actors;
    this.chatId = save.chatId;
    this.variables = save.variables;
    this.settings = save.settings;
  }

  action(name) {
    switch (name) {
      case 'finish':
        this.exit();
    }
  }

  end() {
    this.ended = true;
    this.logs.push(
      {msg: '/finish'}
    );
  }

  exit() {
    clearInterval(this.checkLabelRefresher);
    this.mediaService.stopMusic();
    this.mediaService.stopAmbiance();
    this.actorService.ownActor = '';
    this.exited = true;
    if (!this.bookService.debug) {
      this.bookService.unsyncBook();
    }
    this.navCtrl.pop();
  }

  answer(answer: string) {
    this.variables.answer = answer.trim();
    this.question = false;
    this.resume();
  }

  toVariable(val: string) {
    if (val !== undefined) {
      if (val.charAt(0) === '$') {
        val = this.getVariableName(val);
        if (this.haveVariable(val)) {
          return this.variables[val];
        }
      }
    }
    return val;
  }

  toName(val: string) {
    if (val !== undefined) {
      val.replace('$', '');
      val.replace('@', '');
    }
    return val;
  }

  async askQuestion() {
    const buttons = [];
    for (const answer of this.answers) {
      buttons.push({
        text: this.toVariable(answer),
        handler: () => {
          this.answer(this.toVariable(answer));
        }
      });
    }
    let header = this.GAME.answer;
    const lastLog = this.logs[this.logs.length - 1];
    if (lastLog !== undefined) {
      if (lastLog.msg.charAt(0) !== '/') {
        header = lastLog.msg.substring(0, 30);
      }
    }
    const actionSheet = await this.actionSheetController.create({
      header,
      buttons,
    });
    await actionSheet.present();
  }

  wait(second: number) {
    return new Promise(res => setTimeout(() => res(), second * 1000));
  }

  getNextEndIf() {
    let cpt = 0;
    for (let i = this.line + 1; i < this.chatLogs.length; i++) {
      const log = this.chatLogs[i];
      if (['/if', '/question'].includes(this.getCommand(log.msg))) {
        cpt += 1;
      }
      if (this.getCommand(log.msg) === '/end') {
        if (cpt > 0) {
          cpt -= 1;
        } else {
          return i + 1;
        }
      }
      if (this.getCommand(log.msg) === '/else') {
        if (cpt <= 0) {
          return i + 1;
        }
      }
    }
    // saut ignoré
    return this.line + 1;
  }

  getArg(msg: string) {
    const res = msg.split(' ');
    res.shift();
    return res.join(' ');
  }

  getAnswers(): string[] {
    const res = [];
    let cpt = 0;
    for (let i = this.line + 1; i < this.chatLogs.length; i++) {
      const log = this.chatLogs[i];
      console.log(log);
      if (['/if', '/question'].includes(this.getCommand(log.msg))) {
        cpt += 1;
      }
      if (this.getCommand(log.msg) === '/answer') {
        res.push(this.getArg(log.msg));
      }
      if (this.getCommand(log.msg) === '/end') {
        if (cpt > 0) {
          cpt -= 1;
        } else {
          console.log(res);
          return res;
        }
      }
    }
    // pas de réponse
    return [];
  }


  getNextAnswer() {
    let cpt = 0;
    for (let i = this.line + 1; i < this.chatLogs.length; i++) {
      const log = this.chatLogs[i];
      if (this.getCommand(log.msg) === '/question') {
        cpt += 1;
      }
      if (this.getCommand(log.msg) === '/answer') {
        if (cpt <= 0) {
          return i;
        }
      }
      if (this.getCommand(log.msg) === '/end') {
        if (cpt > 0) {
          cpt -= 1;
        } else {
          return i + 1;
        }
      }
    }
    // saut ignoré
    return this.line + 1;
  }

  async askInput(): Promise<any> {
    let answered = false;
    let type = 'text';
    if (this.opts.includes('type')) {
      type = this.nomVar1;
    }
    await this.popupService.alertObj({
      inputs: [{
        name: 'res',
        placeholder: this.nomVar,
        type,
      }],
      buttons: [
        {
          text: this.COMMON.cancel,
          role: 'cancel',
          cssClass: 'secondary',
        }, {
          text: this.COMMON.ok,
          handler: (data) => {
            this.variables[this.nomVar] = data.res;
            answered = true;
          }
        }
      ]
    });
    await this.popupService.alerter.onDidDismiss();
    if (answered) {
      this.inputShowed = false;
      this.resume();
    }
  }

  send() {
    this.variables[this.nomVar] = this.input;
    this.inputShowed = false;
    this.resume();
  }

  async options() {
    const actionSheet = await this.actionSheetController.create({
      buttons: [{
        text: this.GAME.restartBook,
        role: 'destructive',
        icon: 'refresh',
        handler: () => {
          this.alertRestart();
        }
      }, {
        text: this.COMMON.cancel,
        icon: 'close',
        role: 'cancel',
      }]
    });
    await actionSheet.present();
  }

  async alertRestart() {
    const alert = await this.alertController.create({
      header: this.COMMON.warning,
      message: this.GAME.restartBookWarning,
      buttons: [
        {
          text: this.COMMON.cancel,
          role: 'cancel',
          cssClass: 'secondary',
        }, {
          text: this.COMMON.confirm,
          handler: () => {
            this.restart();
          }
        }
      ]
    });
    await alert.present();
  }

  async restart() {
    if (this.userService.haveSave(this.bookId)) {
      await this.userService.deleteSave(this.bookId);
    }
    this.play();
  }

  getWallpaper() {
    if (this.bookService.book.wallpaper) {
      const wallpaper = this.bookService.book.wallpaper;
      if (wallpaper !== '' && wallpaper.substring(0, 4) !== 'http') {
        const res = 'url(' + this.mediaService.getWallpaperURL(wallpaper) + ')';
        this.bg.nativeElement.style.setProperty('--background', res + ' no-repeat center center / cover');
      }
    }
  }

  getChatSounds() {
    const sounds: string[] = [];
    this.chatLogs.forEach(log => {
      if (this.getCommand(log.msg) === '/sound') {
        sounds.push(this.getFirstArg(log.msg));
      }
    });
    return sounds;
  }

  getChatMusics() {
    const sounds: string[] = [];
    this.chatLogs.forEach(log => {
      if (this.getCommand(log.msg) === '/music') {
        const arg = this.getFirstArg(log.msg);
        if (arg !== '-stop') {
          sounds.push(arg);
        }
      }
    });
    return sounds;
  }

  getChatAmbiances() {
    const sounds: string[] = [];
    this.chatLogs.forEach(log => {
      if (this.getCommand(log.msg) === '/ambiance') {
        const arg = this.getFirstArg(log.msg);
        if (arg !== '-stop') {
          sounds.push(arg);
        }
      }
    });
    return sounds;
  }

  getCommand(msg: string) {
    return msg.split(' ')[0];
  }

  getFirstArg(msg: string) {
    return msg.split(' ')[1];
  }

  next() {
    if (!this.autoPlay) {
      this.time = 0;
      this.waitTime = 0;
    } else {
      clearTimeout(this.nextTimer);
    }
    if (!this.paused) {
      if (this.gochat === '') {
          this.nextTimer = setTimeout(() => {
            this.line = this.curLine;
            this.playLog();
          }, this.time + this.waitTime);
      } else {
          this.nextTimer = setTimeout(() => {
            this.playChat(this.chatService.getChatIdByName(this.gochat));
          }, this.time + this.waitTime);
      }
    }
  }

  enter(keyCode) {
    if (keyCode === 13) {
      this.send();
    }
  }

  playAction(action) {
    if (action.type === 'chat') {
      this.playChat(action.chat);
    } else if (action.type === 'go') {
      this.place = action.chat;
      this.getActions();
    }
  }
}
