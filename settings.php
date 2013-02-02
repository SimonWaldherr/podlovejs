<?php function podlovewebplayer_settings_page() { ?>

<div class="wrap">
<h2>Podlove Web Player Options</h2>

<form method="post" action="options.php">

<?php settings_fields('podlovewebplayer_options'); ?>
<?php do_settings_sections('podlovewebplayer'); ?>

<input name="Submit" type="submit" value="<?php esc_attr_e('Save Changes'); ?>" />

</form>

</div>

<?php } 


function podlovewebplayer_create_menu() {
  add_options_page(
    'Podlove Web Player Options', 
    'Podlove Web Player', 
    'manage_options', 
    'podlovewebplayer', 
    'podlovewebplayer_settings_page'
  );
}

function podlovewebplayer_register_settings() {
  register_setting( 'podlovewebplayer_options', 'podlovewebplayer_options' );
  add_settings_section( 'podlovewebplayer_enclosures', 'Enclosures', false, 'podlovewebplayer' );
  add_settings_field( 
    'podlovewebplayer_enclosure_detect',
    'Turn enclosures to players',
    function(){ 
      $options = get_option('podlovewebplayer_options');
      $checked = "";
      if ( isset( $options['enclosure_detect'] ) )
        $checked = "checked ";
      print "<input id='pwpenclosures1' name='podlovewebplayer_options[enclosure_detect]' 
        $checked type='checkbox' value='1' />&nbsp;&nbsp;
        (WordPress automatically creates an \"enclosure\" custom field whenever it detects an URL to a media file in the post text. 
      Use this option to turn these enclosures into Podlove Web Player instances.)";
    }, 'podlovewebplayer', 'podlovewebplayer_enclosures', array( 'label_for' => 'pwpenclosures1' )
  );
  add_settings_field( 
    'podlovewebplayer_enclosure_force',
    'Force enclosure players',
    function(){ 
      $options = get_option('podlovewebplayer_options');
      $checked = "";
      if ( isset( $options['enclosure_force'] ) )
        $checked = "checked ";
      print "<input id='pwpenclosures1' name='podlovewebplayer_options[enclosure_force]' 
        $checked type='checkbox' value='1' />&nbsp;&nbsp;
        (additionally to regular Podlove Web Players, if both are present)";
    }, 'podlovewebplayer', 'podlovewebplayer_enclosures', array( 'label_for' => 'pwpenclosures2' )
  );
  
  /*
  add_settings_field( 'podlovewebplayer_enclosures', 'pwp_enclosure_bottom' );
  */

  add_settings_section( 'podlovewebplayer_audio', 'Audio player defaults', false, 'podlovewebplayer' );

  /*
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_height' );
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_width' );
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_type' );

  add_settings_section( 'podlovewebplayer_video', 'Video player defaults', function(){}, 'podlovewebplayer' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_height' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_width' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_type' );
  */
}


if ( is_admin() ){
  add_action( 'admin_menu', 'podlovewebplayer_create_menu' );
  add_action( 'admin_init', 'podlovewebplayer_register_settings' );
}

?>